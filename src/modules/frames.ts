/**
 * Mount transforms. No React and no three.js objects, so the tests can
 * check the rotation order on its own.
 *
 * SPEC section 3 applies yaw, then pitch, then roll:
 * yaw about +Y, pitch about the +Z that yaw produced, roll about the +X
 * that those two produced. That is three.js Euler order 'YZX':
 * matrix = Ry(yaw) * Rz(pitch) * Rx(roll).
 *
 * Positive yaw turns the sensor's forward axis (+X) toward −Z (left).
 * Positive pitch turns forward toward +Y (up). Negative pitch tips toward the ground.
 */
import { liftPointToWorld } from '../lift/frames'
import { degreesToRadians } from '../units/convert'
import type { AttachTarget } from '../placement/types'

export function rotateMount(
  point_m: readonly [number, number, number],
  yawPitchRoll_deg: readonly [number, number, number],
): [number, number, number] {
  const [yawDeg, pitchDeg, rollDeg] = yawPitchRoll_deg
  const roll = degreesToRadians(rollDeg)
  const pitch = degreesToRadians(pitchDeg)
  const yaw = degreesToRadians(yawDeg)
  const [x0, y0, z0] = point_m

  // Intrinsic YZX applies the local rotations in order, which is the same
  // as multiplying the point by Rx, then Rz, then Ry.
  const cosRoll = Math.cos(roll)
  const sinRoll = Math.sin(roll)
  const x1 = x0
  const y1 = cosRoll * y0 - sinRoll * z0
  const z1 = sinRoll * y0 + cosRoll * z0

  const cosPitch = Math.cos(pitch)
  const sinPitch = Math.sin(pitch)
  const x2 = cosPitch * x1 - sinPitch * y1
  const y2 = sinPitch * x1 + cosPitch * y1
  const z2 = z1

  // Positive yaw swings +X toward −Z.
  const cosYaw = Math.cos(yaw)
  const sinYaw = Math.sin(yaw)
  return [cosYaw * x2 + sinYaw * z2, y2, -sinYaw * x2 + cosYaw * z2]
}

/** Rotate a point, then add the mount position. */
export function transformPoint(
  point_m: readonly [number, number, number],
  position_m: readonly [number, number, number],
  yawPitchRoll_deg: readonly [number, number, number],
): [number, number, number] {
  const rotated = rotateMount(point_m, yawPitchRoll_deg)
  return [rotated[0] + position_m[0], rotated[1] + position_m[1], rotated[2] + position_m[2]]
}

export interface MountPose {
  position_m: readonly [number, number, number]
  yawPitchRoll_deg: readonly [number, number, number]
}

/**
 * Reflect a mount through the module's forward-up plane (negate Z).
 * Reflection sends yaw and roll to their opposites and leaves pitch alone,
 * because pitch is a tilt toward the ground and that still points down
 * after a left-right flip. The template stays as authored.
 */
export function mirrorMount(pose: MountPose): MountPose {
  const [x, y, z] = pose.position_m
  const [yaw, pitch, roll] = pose.yawPitchRoll_deg
  return {
    position_m: [x, y, -z],
    yawPitchRoll_deg: [-yaw, pitch, -roll],
  }
}

/**
 * A point in one sensor's frame, expressed in the world.
 * Sensor pose is inside the module. Module pose is in the chassis (lift)
 * frame or the platform frame. Platform Y then shifts up by the platform height.
 */
export function sensorPointToWorld(args: {
  pointInSensor_m: readonly [number, number, number]
  sensor: MountPose
  placement: MountPose & { attachTo: AttachTarget; mirrored?: boolean }
  platformHeight_m: number
  pose: { x_m: number; z_m: number; yaw_rad: number }
}): [number, number, number] {
  const sensor = args.placement.mirrored ? mirrorMount(args.sensor) : args.sensor
  const inModule = transformPoint(args.pointInSensor_m, sensor.position_m, sensor.yawPitchRoll_deg)
  const inAttach = transformPoint(inModule, args.placement.position_m, args.placement.yawPitchRoll_deg)
  const inLift: [number, number, number] =
    args.placement.attachTo === 'platform'
      ? [inAttach[0], inAttach[1] + args.platformHeight_m, inAttach[2]]
      : [inAttach[0], inAttach[1], inAttach[2]]
  return liftPointToWorld(inLift, args.pose)
}
