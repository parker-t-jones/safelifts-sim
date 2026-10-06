/**
 * Default "32-in slab scissor, 19-ft class" lift.
 * Every number is approximate. The Lift tab says so, and each one can be edited.
 * Values the spec states are used as given. The rest are placeholders until
 * a real spec sheet replaces them.
 */
import type { LiftPose, LiftSpec } from './types'

export const APPROXIMATE_LIFT: LiftSpec = {
  name: '32-in slab scissor, 19-ft class',
  // Spec: about 1.83 m long.
  chassisLength_m: 1.83,
  // Spec: 0.81 m (32 in). Stored as the exact 32 in conversion.
  chassisWidth_m: 0.8128,
  // Approximate. About 1 inch inside each chassis edge, so the wheels
  // sit slightly narrower than the chassis.
  trackWidth_m: 0.76,
  // Placeholder. Top of the base, not the stowed platform.
  chassisHeight_m: 0.85,
  // Spec: about 1.4 m.
  wheelbase_m: 1.4,
  // Placeholder. Main deck only, not the slide-out.
  platformLength_m: 1.6,
  // Placeholder. A little narrower than the 32 in chassis.
  platformWidth_m: 0.72,
  // Placeholder. About 3 ft of slide-out at the front. 0 would hide it.
  extensionDeckLength_m: 0.91,
  // Spec: about 1.1 m.
  guardrailHeight_m: 1.1,
  // Placeholder. Platform floor when fully lowered. Kept above the chassis
  // so the scissor stack still has a little room.
  platformHeightMin_m: 1.15,
  // Spec: about 5.8 m (19 ft).
  platformHeightMax_m: 5.8,
  // Spec: about 0.9 m/s stowed, about 0.2 m/s when elevated.
  driveSpeedStowed_mps: 0.9,
  driveSpeedElevated_mps: 0.2,
  // Placeholder. Elevated speed applies only above this platform-floor height.
  elevatedThreshold_m: 1.8,
  // Placeholder degrees. The form edits degrees; driving math converts to radians.
  maxSteerAngle_deg: 45,
  // Placeholder. About 30 seconds from stowed to full height with the numbers above.
  liftSpeed_mps: 0.15,
  // Placeholder. Speeding up only. Braking uses the two rates below.
  accel_mps2: 0.8,
  // Placeholder. Stopping from 0.9 m/s takes about 0.6 s once braking starts.
  brakeDecelStowed_mps2: 1.5,
  // Placeholder. Gentler while elevated, so a high platform does not stop as hard.
  brakeDecelElevated_mps2: 0.5,
  // Default 0 so W/A/S/D/Space respond immediately. Raise it to add machine lag.
  controlLatency_s: 0,
  // Placeholder. Used for the stopping-distance readout, not for key delay.
  operatorReaction_s: 0.5,
  // Blank until a spec sheet says driving must stop above a height.
  maxDriveHeight_m: null,
  // Blank until the spec sheet's inside and outside turn numbers are entered.
  specInsideTurnRadius_m: null,
  specOutsideTurnRadius_m: null,
  // Spec sheets usually quote the wheel paths. The full body is still shown beside this.
  turnCompareMeasure: 'wheels',
}

export function initialPose(spec: LiftSpec): LiftPose {
  return {
    x_m: 0,
    z_m: 0,
    yaw_rad: 0,
    speed_mps: 0,
    steer_rad: 0,
    platformHeight_m: spec.platformHeightMin_m,
  }
}
