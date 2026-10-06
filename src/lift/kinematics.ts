/**
 * Bicycle-model driving for the scissor lift.
 *
 * The rear axle is fixed (it does not steer) and sits half a wheelbase
 * behind the lift origin. The front axle is half a wheelbase ahead.
 * Turning radius to the rear axle is wheelbase / tan(steer).
 * Positive steer is a left turn: while driving forward the nose yaws
 * toward the lift's left (−Z).
 */
import { degreesToRadians } from '../units/convert'
import type { LiftPose, LiftSpec, TurnMeasure } from './types'
import { forwardXZ } from './frames'

/** Ignore steer this close to zero and drive straight, so we never divide by tan(0). */
const STEER_STRAIGHT_RAD = 1e-4

/**
 * tan(90°) is infinite. Clamp before dividing so a typed 90° cannot
 * produce an infinite radius or a NaN pose.
 */
const MAX_SAFE_STEER_RAD = degreesToRadians(89)

/** How fast the wheels chase the A/D keys, then return to center when released. */
export const STEER_RATE_RADPS = degreesToRadians(70)

export interface DriveCommand {
  /** +1 forward, −1 reverse, 0 coast toward a stop. */
  throttle: -1 | 0 | 1
  /** +1 steer left, −1 steer right, 0 ease back to straight. */
  steer: -1 | 0 | 1
  /** +1 raise the platform, −1 lower it, 0 hold the height. */
  lift: -1 | 0 | 1
  /** Space bar. Requests a stop, then the lift brakes at the deceleration rate. */
  stop: boolean
}

/** Remembers the drive command the machine is still following during control latency. */
export interface CommandMemory {
  applied: DriveCommand
  pending: DriveCommand
  /** Seconds left before pending replaces applied. */
  remaining_s: number
}

export function idleDriveCommand(): DriveCommand {
  return { throttle: 0, steer: 0, lift: 0, stop: false }
}

export function initialCommandMemory(): CommandMemory {
  const idle = idleDriveCommand()
  return { applied: idle, pending: idle, remaining_s: 0 }
}

/**
 * Radius from the rear axle to the turn center.
 * Null means the path is straight.
 * The sign matches the steer angle: positive radius is a left turn.
 */
export function turningRadius_m(wheelbase_m: number, steer_rad: number): number | null {
  if (wheelbase_m <= 0 || Math.abs(steer_rad) < STEER_STRAIGHT_RAD) {
    return null
  }
  const steer = clamp(steer_rad, -MAX_SAFE_STEER_RAD, MAX_SAFE_STEER_RAD)
  return wheelbase_m / Math.tan(steer)
}

/**
 * Stowed speed at or below the threshold. Elevated speed only once the
 * platform floor is strictly above it.
 */
export function speedLimit_mps(spec: LiftSpec, platformHeight_m: number): number {
  if (platformHeight_m > spec.elevatedThreshold_m) {
    return Math.abs(spec.driveSpeedElevated_mps)
  }
  return Math.abs(spec.driveSpeedStowed_mps)
}

/**
 * Same height rule as the speed limit. Elevated braking applies only
 * when the platform floor is strictly above the threshold.
 */
export function brakeDecel_mps2(spec: LiftSpec, platformHeight_m: number): number {
  if (platformHeight_m > spec.elevatedThreshold_m) {
    return Math.abs(spec.brakeDecelElevated_mps2)
  }
  return Math.abs(spec.brakeDecelStowed_mps2)
}

/** True when an optional max drive height is set and the platform is above it. */
export function driveIsDisabled(spec: LiftSpec, platformHeight_m: number): boolean {
  return spec.maxDriveHeight_m !== null && platformHeight_m > spec.maxDriveHeight_m
}

export interface TurnEnvelope {
  /** Closest measured point to the turn center. */
  inside_m: number
  /** Farthest measured point from the turn center. */
  outside_m: number
}

/**
 * Inside and outside radii of the current steer angle.
 * Null means the path is straight, so those radii are not defined.
 * Spec-sheet inside/outside fields are not used here.
 *
 * wheels: the four wheel centers. Their spacing is trackWidth_m,
 * the same spacing used to draw the wheels.
 * chassis: the four corners of the chassis rectangle.
 * body: those chassis corners plus the platform, including the extension deck.
 * That last one is the full swept envelope.
 */
export function turnEnvelope_m(
  spec: LiftSpec,
  steer_rad: number,
  measure: TurnMeasure,
): TurnEnvelope | null {
  const radius_m = turningRadius_m(spec.wheelbase_m, steer_rad)
  if (radius_m === null) {
    return null
  }
  // Rear axle is behind the origin. Positive radius puts the center on the left (−Z).
  const centerX = -spec.wheelbase_m * 0.5
  const centerZ = -radius_m
  let inside_m = Infinity
  let outside_m = 0
  for (const point of pointsForMeasure(spec, measure)) {
    const distance_m = Math.hypot(point.x - centerX, point.z - centerZ)
    inside_m = Math.min(inside_m, distance_m)
    outside_m = Math.max(outside_m, distance_m)
  }
  return { inside_m, outside_m }
}

/**
 * Straight-line stopping distance: v·t_react + v²/(2·a_brake).
 * Speed is taken as an absolute value. Null means the braking rate is
 * zero while the lift is still moving, so this formula cannot finish the stop.
 * Control latency is not included. Keyboard driving does not wait for t_react.
 * The HUD labels this straight-line. The warning-distance preview adds
 * frames-to-confirm update periods and the sensor's processing latency
 * before this reaction time. That preview is not on the HUD yet.
 */
export function stoppingDistance_m(
  speed_mps: number,
  reaction_s: number,
  brake_mps2: number,
): number | null {
  const speed = Math.abs(speed_mps)
  const reaction = Math.max(0, reaction_s)
  const brake = Math.abs(brake_mps2)
  if (speed === 0) {
    return 0
  }
  if (brake === 0) {
    return null
  }
  return speed * reaction + (speed * speed) / (2 * brake)
}

/**
 * Straight-line stop if the decision is delayed by extraDelay_s before
 * the operator reaction time. The HUD does not use this yet.
 * extraDelay_s is frames-to-confirm update periods plus processing latency,
 * so a faster resolution mode or fewer confirm frames shortens the warning distance.
 */
export function warningDistance_m(
  speed_mps: number,
  reaction_s: number,
  brake_mps2: number,
  extraDelay_s: number,
): number | null {
  const delay_s = Math.max(0, reaction_s) + Math.max(0, extraDelay_s)
  return stoppingDistance_m(speed_mps, delay_s, brake_mps2)
}

/**
 * Delay throttle, steer, and stop by the machine's control latency.
 * Raise and lower apply on the same frame. A new drive command restarts
 * the wait. Latency of 0 applies the keys immediately.
 */
export function stepCommandMemory(
  memory: CommandMemory,
  requested: DriveCommand,
  latency_s: number,
  dt_s: number,
): CommandMemory {
  const latency = Math.max(0, latency_s)
  if (latency === 0 || driveIntentEqual(memory.applied, requested)) {
    return { applied: requested, pending: requested, remaining_s: 0 }
  }

  const samePending = driveIntentEqual(memory.pending, requested)
  const remaining_s = (samePending ? memory.remaining_s : latency) - dt_s
  if (remaining_s <= 0) {
    return { applied: requested, pending: requested, remaining_s: 0 }
  }
  return {
    applied: { ...memory.applied, lift: requested.lift },
    pending: requested,
    remaining_s,
  }
}

function driveIntentEqual(a: DriveCommand, b: DriveCommand): boolean {
  return a.throttle === b.throttle && a.steer === b.steer && a.stop === b.stop
}

interface PlanCorner {
  x: number
  z: number
}

function pointsForMeasure(spec: LiftSpec, measure: TurnMeasure): PlanCorner[] {
  if (measure === 'wheels') {
    return wheelCenters(spec)
  }
  const chassis = rectangleCorners(spec.chassisLength_m, spec.chassisWidth_m, 0)
  if (measure === 'chassis') {
    return chassis
  }
  const extension_m = Math.max(0, spec.extensionDeckLength_m)
  const platform = rectangleCorners(spec.platformLength_m, spec.platformWidth_m, extension_m)
  return [...chassis, ...platform]
}

/**
 * Wheel centers at the axle ends, spaced by the editable track width.
 */
function wheelCenters(spec: LiftSpec): PlanCorner[] {
  const halfBase = spec.wheelbase_m * 0.5
  const halfTrack = Math.abs(spec.trackWidth_m) * 0.5
  return [
    { x: -halfBase, z: -halfTrack },
    { x: -halfBase, z: halfTrack },
    { x: halfBase, z: -halfTrack },
    { x: halfBase, z: halfTrack },
  ]
}

/**
 * A rectangle centered on the origin, then shifted forward by extraFront_m.
 * The extension deck is that forward shift, so the rear edge stays put.
 */
function rectangleCorners(length_m: number, width_m: number, extraFront_m: number): PlanCorner[] {
  const rearX = -Math.abs(length_m) * 0.5
  const frontX = Math.abs(length_m) * 0.5 + extraFront_m
  const halfWidth = Math.abs(width_m) * 0.5
  return [
    { x: frontX, z: -halfWidth },
    { x: frontX, z: halfWidth },
    { x: rearX, z: -halfWidth },
    { x: rearX, z: halfWidth },
  ]
}

/**
 * Move the lift for dt_s seconds at its current speed and steer.
 * Speed and steer are not changed here; stepLift updates those first.
 * A non-zero steer follows an exact circular arc, not a chain of tiny straight steps.
 */
export function integrateBicycle(
  pose: LiftPose,
  wheelbase_m: number,
  dt_s: number,
): Pick<LiftPose, 'x_m' | 'z_m' | 'yaw_rad'> {
  const yaw = pose.yaw_rad
  const half_m = wheelbase_m * 0.5
  const forward = forwardXZ(yaw)
  const rearX = pose.x_m - forward.x * half_m
  const rearZ = pose.z_m - forward.z * half_m
  const distance_m = pose.speed_mps * dt_s
  const radius_m = turningRadius_m(wheelbase_m, pose.steer_rad)

  if (radius_m === null) {
    const nextRearX = rearX + forward.x * distance_m
    const nextRearZ = rearZ + forward.z * distance_m
    return {
      x_m: nextRearX + forward.x * half_m,
      z_m: nextRearZ + forward.z * half_m,
      yaw_rad: yaw,
    }
  }

  // Signed radius: positive steer puts the turn center on the lift's left.
  const leftX = -Math.sin(yaw)
  const leftZ = -Math.cos(yaw)
  const centerX = rearX + leftX * radius_m
  const centerZ = rearZ + leftZ * radius_m
  const offsetX = rearX - centerX
  const offsetZ = rearZ - centerZ
  const dYaw = distance_m / radius_m
  const cos = Math.cos(dYaw)
  const sin = Math.sin(dYaw)
  // Same right-handed Y rotation as three.js: +X swings toward −Z.
  const rotatedX = offsetX * cos + offsetZ * sin
  const rotatedZ = -offsetX * sin + offsetZ * cos
  const nextRearX = centerX + rotatedX
  const nextRearZ = centerZ + rotatedZ
  const nextYaw = yaw + dYaw
  const nextForward = forwardXZ(nextYaw)
  return {
    x_m: nextRearX + nextForward.x * half_m,
    z_m: nextRearZ + nextForward.z * half_m,
    yaw_rad: nextYaw,
  }
}

/**
 * One simulation step: accelerate, steer, raise or lower, then move.
 * Call this from the render loop. Tests call it directly.
 */
export function stepLift(
  pose: LiftPose,
  spec: LiftSpec,
  command: DriveCommand,
  dt_s: number,
): LiftPose {
  if (dt_s <= 0) {
    return pose
  }

  const limit_mps = speedLimit_mps(spec, pose.platformHeight_m)
  // Above max drive height the machine ignores the throttle. That is not a reaction delay.
  const driveDisabled = driveIsDisabled(spec, pose.platformHeight_m)
  const targetSpeed = command.stop || driveDisabled ? 0 : command.throttle * limit_mps
  const rate_mps2 = speedChangeRate_mps2(pose.speed_mps, targetSpeed, spec, pose.platformHeight_m)
  const speed_mps = approach(pose.speed_mps, targetSpeed, rate_mps2 * dt_s)

  const maxSteer = Math.min(Math.abs(degreesToRadians(spec.maxSteerAngle_deg)), MAX_SAFE_STEER_RAD)
  const steer_rad = approach(pose.steer_rad, command.steer * maxSteer, STEER_RATE_RADPS * dt_s)

  const liftRate = Math.abs(spec.liftSpeed_mps)
  const platformHeight_m = clamp(
    pose.platformHeight_m + command.lift * liftRate * dt_s,
    spec.platformHeightMin_m,
    spec.platformHeightMax_m,
  )

  const moved = integrateBicycle({ ...pose, speed_mps, steer_rad }, spec.wheelbase_m, dt_s)
  return { ...moved, speed_mps, steer_rad, platformHeight_m }
}

/**
 * Acceleration while |speed| is rising in the target direction.
 * Braking while slowing down or reversing through zero.
 */
function speedChangeRate_mps2(
  speed_mps: number,
  target_mps: number,
  spec: LiftSpec,
  platformHeight_m: number,
): number {
  const accel_mps2 = Math.abs(spec.accel_mps2)
  const brake_mps2 = brakeDecel_mps2(spec, platformHeight_m)
  if (speed_mps === 0) {
    return target_mps === 0 ? brake_mps2 : accel_mps2
  }
  if (Math.sign(target_mps) !== Math.sign(speed_mps)) {
    return brake_mps2
  }
  if (Math.abs(target_mps) < Math.abs(speed_mps)) {
    return brake_mps2
  }
  return accel_mps2
}

/** Pull current toward target, but never more than maxDelta in one step. */
function approach(current: number, target: number, maxDelta: number): number {
  const delta = target - current
  if (Math.abs(delta) <= maxDelta) {
    return target
  }
  return current + Math.sign(delta) * maxDelta
}

export function clamp(value: number, a: number, b: number): number {
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  return Math.min(hi, Math.max(lo, value))
}
