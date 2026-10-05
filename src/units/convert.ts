/**
 * Converts between internal units (meters, radians) and the units
 * people type or read (feet, inches, degrees).
 *
 * Call these only at the UI boundary. Physics and sensor math should
 * keep using meters and radians so mixed units cannot sneak into a formula.
 */

/** International foot. Exact by definition: 1 ft = 0.3048 m. */
export const METERS_PER_FOOT = 0.3048

/** International inch. Exact by definition: 1 in = 0.0254 m. */
export const METERS_PER_INCH = 0.0254

export function metersToFeet(length_m: number): number {
  return length_m / METERS_PER_FOOT
}

export function feetToMeters(length_ft: number): number {
  return length_ft * METERS_PER_FOOT
}

export function metersToInches(length_m: number): number {
  return length_m / METERS_PER_INCH
}

export function inchesToMeters(length_in: number): number {
  return length_in * METERS_PER_INCH
}

/** Sensor forms accept degrees. Math inside the sim uses radians. */
export function degreesToRadians(angle_deg: number): number {
  return (angle_deg * Math.PI) / 180
}

export function radiansToDegrees(angle_rad: number): number {
  return (angle_rad * 180) / Math.PI
}
