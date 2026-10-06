/**
 * Bicycle-model tests: turning radius, straight driving, elevated speed,
 * and the sign of a left turn.
 */
import { describe, expect, it } from 'vitest'
import { degreesToRadians } from '../../src/units/convert'
import { APPROXIMATE_LIFT, initialPose } from '../../src/lift/preset'
import {
  brakeDecel_mps2,
  driveIsDisabled,
  idleDriveCommand,
  initialCommandMemory,
  integrateBicycle,
  speedLimit_mps,
  stepCommandMemory,
  stepLift,
  stoppingDistance_m,
  turnEnvelope_m,
  warningDistance_m,
  turningRadius_m,
} from '../../src/lift/kinematics'
import type { DriveCommand } from '../../src/lift/kinematics'
import type { LiftPose } from '../../src/lift/types'

const stopped: DriveCommand = { throttle: 0, steer: 0, lift: 0, stop: false }

describe('turningRadius_m', () => {
  it('is wheelbase / tan(steer) for a 45 degree steer', () => {
    expect(turningRadius_m(1.4, degreesToRadians(45))).toBeCloseTo(1.4, 8)
  })

  it('is straight when the steer angle is zero', () => {
    expect(turningRadius_m(1.4, 0)).toBeNull()
  })

  it('uses a negative radius for a right turn', () => {
    const left = turningRadius_m(1.4, degreesToRadians(30))
    const right = turningRadius_m(1.4, degreesToRadians(-30))
    expect(left).not.toBeNull()
    expect(right).toBeCloseTo(-(left as number), 8)
  })
})

describe('integrateBicycle', () => {
  it('drives straight along forward by speed × time', () => {
    const pose = poseAt({ speed_mps: 2, steer_rad: 0 })
    const next = integrateBicycle(pose, 1.4, 0.5)
    expect(next.x_m).toBeCloseTo(1, 8)
    expect(next.z_m).toBeCloseTo(0, 8)
    expect(next.yaw_rad).toBeCloseTo(0, 8)
  })

  it('turns left about the rear axle through a quarter circle', () => {
    // Wheelbase 2 m, steer 45°, so the radius is 2 m.
    // At 1 m/s, a quarter turn takes π seconds and faces world −Z.
    const wheelbase_m = 2
    const pose = poseAt({
      speed_mps: 1,
      steer_rad: degreesToRadians(45),
    })
    const next = integrateBicycle(pose, wheelbase_m, Math.PI)
    expect(next.yaw_rad).toBeCloseTo(Math.PI / 2, 6)
    expect(next.x_m).toBeCloseTo(1, 6)
    expect(next.z_m).toBeCloseTo(-3, 6)
  })

  it('yaws the other way when reversing with left steer', () => {
    const pose = poseAt({
      speed_mps: -1,
      steer_rad: degreesToRadians(20),
    })
    const next = integrateBicycle(pose, 1.4, 0.2)
    expect(next.yaw_rad).toBeLessThan(0)
  })
})

describe('speedLimit_mps', () => {
  const spec = {
    ...APPROXIMATE_LIFT,
    driveSpeedStowed_mps: 0.9,
    driveSpeedElevated_mps: 0.2,
    elevatedThreshold_m: 1.8,
  }

  it('uses the stowed speed at and below the threshold', () => {
    expect(speedLimit_mps(spec, 1.8)).toBe(0.9)
    expect(speedLimit_mps(spec, 1.15)).toBe(0.9)
  })

  it('uses the elevated speed only above the threshold', () => {
    expect(speedLimit_mps(spec, 1.81)).toBe(0.2)
  })
})

describe('brakeDecel_mps2', () => {
  const spec = {
    ...APPROXIMATE_LIFT,
    elevatedThreshold_m: 1.8,
    brakeDecelStowed_mps2: 1.5,
    brakeDecelElevated_mps2: 0.5,
  }

  it('uses the stowed rate at and below the threshold', () => {
    expect(brakeDecel_mps2(spec, 1.8)).toBe(1.5)
  })

  it('uses the elevated rate only above the threshold', () => {
    expect(brakeDecel_mps2(spec, 1.81)).toBe(0.5)
  })
})

describe('stoppingDistance_m', () => {
  it('is v·t plus v² over twice the braking rate', () => {
    expect(stoppingDistance_m(2, 0.5, 1)).toBeCloseTo(3, 8)
  })

  it('uses the absolute speed', () => {
    expect(stoppingDistance_m(-2, 0.5, 1)).toBeCloseTo(3, 8)
  })

  it('is zero when the lift is already stopped', () => {
    expect(stoppingDistance_m(0, 0.5, 1.5)).toBe(0)
  })

  it('is undefined when the lift is moving and the braking rate is zero', () => {
    expect(stoppingDistance_m(1, 0.5, 0)).toBeNull()
  })
})

describe('warningDistance_m', () => {
  it('adds the extra delay to the reaction time before braking', () => {
    // v·(0.5 + 0.25) + v²/(2·1) = 1.5 + 2
    expect(warningDistance_m(2, 0.5, 1, 0.25)).toBeCloseTo(3.5, 8)
  })
})

describe('turnEnvelope_m', () => {
  const tight = {
    ...APPROXIMATE_LIFT,
    wheelbase_m: 2,
    chassisLength_m: 4,
    chassisWidth_m: 2,
    platformLength_m: 2,
    platformWidth_m: 2,
    extensionDeckLength_m: 2,
    trackWidth_m: 2,
  }

  it('is undefined on a straight path', () => {
    expect(turnEnvelope_m(APPROXIMATE_LIFT, 0, 'body')).toBeNull()
  })

  it('measures the closest and farthest chassis corners at 45 degrees', () => {
    // Wheelbase 2 m and 45° steer put the turn center 2 m to the left of the rear axle.
    // Chassis is 4 m by 2 m, centered on the origin, so the rear axle is at x = −1.
    // The inside rear corner is 1.414 m from that center. The outside front corner is 4.243 m.
    const spec = { ...tight, platformLength_m: 4, extensionDeckLength_m: 0 }
    const envelope = turnEnvelope_m(spec, degreesToRadians(45), 'chassis')
    expect(envelope).not.toBeNull()
    expect(envelope?.inside_m).toBeCloseTo(Math.SQRT2, 6)
    expect(envelope?.outside_m).toBeCloseTo(Math.sqrt(18), 6)
  })

  it('measures the wheel centers, with the inside rear wheel one meter from the center', () => {
    const wheels = turnEnvelope_m(tight, degreesToRadians(45), 'wheels')
    expect(wheels?.inside_m).toBeCloseTo(1, 6)
    expect(wheels?.outside_m).toBeCloseTo(Math.sqrt(13), 6)
  })

  it('uses track width for the wheel centers, so a narrower track sits farther from the turn center', () => {
    const narrow = turnEnvelope_m({ ...tight, trackWidth_m: 1 }, degreesToRadians(45), 'wheels')
    expect(narrow?.inside_m).toBeCloseTo(1.5, 6)
  })

  it('lets the extension deck increase the full swept outside radius', () => {
    const chassis = turnEnvelope_m(tight, degreesToRadians(45), 'chassis')
    const body = turnEnvelope_m(tight, degreesToRadians(45), 'body')
    expect(chassis).not.toBeNull()
    expect(body?.outside_m).toBeGreaterThan(chassis?.outside_m ?? 0)
    expect(body?.outside_m).toBeCloseTo(5, 6)
  })
})

describe('stepCommandMemory', () => {
  it('applies a drive command immediately when latency is zero', () => {
    const next = stepCommandMemory(initialCommandMemory(), { ...stopped, throttle: 1 }, 0, 0.016)
    expect(next.applied.throttle).toBe(1)
    expect(next.remaining_s).toBe(0)
  })

  it('keeps the old drive command until the control latency is over', () => {
    const driving = { ...idleDriveCommand(), throttle: 1 as const }
    const memory = { applied: driving, pending: driving, remaining_s: 0 }
    const next = stepCommandMemory(memory, stopped, 1, 0.4)
    expect(next.applied.throttle).toBe(1)
    expect(next.remaining_s).toBeCloseTo(0.6, 8)
  })

  it('applies the new command once the wait elapses', () => {
    const driving = { ...idleDriveCommand(), throttle: 1 as const }
    const waiting = stepCommandMemory(
      { applied: driving, pending: driving, remaining_s: 0 },
      stopped,
      1,
      0.4,
    )
    const next = stepCommandMemory(waiting, stopped, 1, 0.7)
    expect(next.applied.throttle).toBe(0)
    expect(next.remaining_s).toBe(0)
  })

  it('raises the platform immediately while a drive change is still waiting', () => {
    const memory = initialCommandMemory()
    const next = stepCommandMemory(memory, { ...stopped, lift: 1 }, 1, 0.1)
    expect(next.applied.lift).toBe(1)
    expect(next.remaining_s).toBe(0)
  })
})

describe('stepLift', () => {
  it('does not exceed the elevated speed limit', () => {
    const spec = {
      ...APPROXIMATE_LIFT,
      elevatedThreshold_m: 1,
      driveSpeedElevated_mps: 0.2,
      accel_mps2: 5,
    }
    const pose = poseAt({ platformHeight_m: 2, speed_mps: 0 })
    const next = stepLift(pose, spec, { ...stopped, throttle: 1 }, 2)
    expect(next.speed_mps).toBeCloseTo(0.2, 8)
  })

  it('brakes at the stowed rate when stop is held', () => {
    const spec = { ...APPROXIMATE_LIFT, brakeDecelStowed_mps2: 1.5 }
    const pose = poseAt({ speed_mps: 0.9, platformHeight_m: spec.elevatedThreshold_m })
    const next = stepLift(pose, spec, { ...stopped, stop: true, throttle: 1 }, 0.2)
    expect(next.speed_mps).toBeCloseTo(0.6, 8)
  })

  it('uses braking, not acceleration, when the throttle is released', () => {
    const spec = {
      ...APPROXIMATE_LIFT,
      accel_mps2: 5,
      brakeDecelStowed_mps2: 0.8,
    }
    const pose = poseAt({ speed_mps: 0.9, platformHeight_m: spec.elevatedThreshold_m })
    const next = stepLift(pose, spec, stopped, 0.5)
    expect(next.speed_mps).toBeCloseTo(0.5, 8)
  })

  it('uses drive acceleration while speeding up', () => {
    const spec = {
      ...APPROXIMATE_LIFT,
      accel_mps2: 0.4,
      brakeDecelStowed_mps2: 5,
      driveSpeedStowed_mps: 0.9,
    }
    const pose = poseAt({ speed_mps: 0, platformHeight_m: spec.platformHeightMin_m })
    const next = stepLift(pose, spec, { ...stopped, throttle: 1 }, 1)
    expect(next.speed_mps).toBeCloseTo(0.4, 8)
  })

  it('uses the elevated braking rate only above the threshold', () => {
    const spec = {
      ...APPROXIMATE_LIFT,
      elevatedThreshold_m: 1.8,
      brakeDecelStowed_mps2: 2,
      brakeDecelElevated_mps2: 0.4,
    }
    const pose = poseAt({ speed_mps: 0.9, platformHeight_m: 2 })
    const next = stepLift(pose, spec, stopped, 0.5)
    expect(next.speed_mps).toBeCloseTo(0.7, 8)
  })

  it('ignores the throttle above the optional max drive height', () => {
    const spec = {
      ...APPROXIMATE_LIFT,
      maxDriveHeight_m: 2,
      accel_mps2: 5,
      brakeDecelElevated_mps2: 0.4,
      elevatedThreshold_m: 1,
    }
    expect(driveIsDisabled(spec, 3)).toBe(true)
    const pose = poseAt({ speed_mps: 1, platformHeight_m: 3 })
    const next = stepLift(pose, spec, { ...stopped, throttle: 1 }, 0.5)
    expect(next.speed_mps).toBeCloseTo(0.8, 8)
  })
})

function poseAt(patch: Partial<LiftPose>): LiftPose {
  return { ...initialPose(APPROXIMATE_LIFT), ...patch }
}
