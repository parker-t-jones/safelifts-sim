/**
 * Lift data. LiftSpec is the editable description of the machine.
 * LiftPose is the live position while you drive. Only LiftSpec is
 * meant to be saved later; the pose is runtime state.
 */

export interface LiftSpec {
  name: string
  chassisLength_m: number
  chassisWidth_m: number
  /**
   * Distance between the left and right wheel centers.
   * Slightly inside the chassis by default. Used for the drawn wheels
   * and for the Wheels turning-radius measurement.
   */
  trackWidth_m: number
  /** Top of the chassis above the floor. */
  chassisHeight_m: number
  wheelbase_m: number
  /** Main platform only. The extension deck is extra length in +X. */
  platformLength_m: number
  platformWidth_m: number
  /** Slide-out deck at the front. 0 hides it. */
  extensionDeckLength_m: number
  /** Height of the rails above the platform floor. */
  guardrailHeight_m: number
  /** Stowed height of the platform floor. */
  platformHeightMin_m: number
  platformHeightMax_m: number
  driveSpeedStowed_mps: number
  /** Used when the platform floor is above elevatedThreshold_m. */
  driveSpeedElevated_mps: number
  elevatedThreshold_m: number
  /** Stored in degrees because that is how the spec sheet and the form read. */
  maxSteerAngle_deg: number
  /** How fast the platform floor rises or lowers. */
  liftSpeed_mps: number
  /** Rate used only while speed is increasing toward the throttle. */
  accel_mps2: number
  /**
   * Braking rate at or below the elevated-speed height.
   * Used when slowing down, including Space and a released throttle.
   */
  brakeDecelStowed_mps2: number
  /** Braking rate once the platform floor is above the elevated-speed height. */
  brakeDecelElevated_mps2: number
  /**
   * Machine delay before W, S, A, D, and Space take effect.
   * 0 means those keys respond on the same frame. Raise and lower are not delayed.
   */
  controlLatency_s: number
  /**
   * Operator time before a stop begins. The HUD uses it for stopping distance.
   * Keyboard driving does not wait for this. When alerts exist, an optional
   * auto-brake can wait this long after an alert before it starts.
   */
  operatorReaction_s: number
  /**
   * Optional. Null means driving is allowed at every height.
   * Above this platform-floor height the throttle is ignored.
   */
  maxDriveHeight_m: number | null
  /**
   * Optional spec-sheet inside turning radius. Null means it has not been entered.
   * It is only a comparison number. It does not change the bicycle model.
   */
  specInsideTurnRadius_m: number | null
  /** Optional spec-sheet outside turning radius. Same comparison-only rule. */
  specOutsideTurnRadius_m: number | null
  /**
   * Which points are compared with the spec-sheet turning radii.
   * The full swept envelope is always shown as well.
   */
  turnCompareMeasure: TurnMeasure
}

/** What the spec-sheet inside/outside comparison is measured to. */
export type TurnMeasure = 'wheels' | 'chassis' | 'body'

export interface LiftPose {
  /** World X of the lift origin (center of the chassis footprint). */
  x_m: number
  /** World Z of the lift origin. World Y of the origin is always 0 (the floor). */
  z_m: number
  /**
   * Rotation about world +Y, in radians.
   * 0 means the lift's forward (+X) points along world +X.
   * Positive yaw turns the nose toward world −Z (the lift's left).
   */
  yaw_rad: number
  /** Speed of the rear axle along the lift's forward axis. Negative is reverse. */
  speed_mps: number
  /** Front-wheel steer angle in radians. Positive steers left (toward lift −Z). */
  steer_rad: number
  /** Platform floor height above the world floor. */
  platformHeight_m: number
}
