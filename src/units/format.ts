/**
 * Formats internal lengths for on-screen labels.
 * Imperial is feet and inches (the construction-site default).
 * Metric is meters.
 */
import { METERS_PER_INCH, metersToFeet, radiansToDegrees } from './convert'
import type { DisplayUnitSystem } from './types'

/**
 * Inches are rounded to the nearest tenth so labels stay short and stable.
 * A tenth of an inch is about 2.5 mm, finer than we need for a HUD.
 */
const INCH_TENTHS = 10
const INCHES_PER_FOOT = 12

export function formatLength(length_m: number, system: DisplayUnitSystem): string {
  if (system === 'metric') {
    return `${length_m.toFixed(2)} m`
  }
  return formatFeetAndInches(length_m)
}

function formatFeetAndInches(length_m: number): string {
  const totalInchTenths = Math.round((Math.abs(length_m) / METERS_PER_INCH) * INCH_TENTHS)
  if (totalInchTenths === 0) {
    return '0 ft 0 in'
  }

  const tenthsPerFoot = INCHES_PER_FOOT * INCH_TENTHS
  const feet = Math.floor(totalInchTenths / tenthsPerFoot)
  const inchTenths = totalInchTenths - feet * tenthsPerFoot
  const sign = length_m < 0 ? '-' : ''

  return `${sign}${feet} ft ${formatInchTenths(inchTenths)} in`
}

/** Speed label for the HUD. Imperial uses feet per second, not miles per hour. */
export function formatSpeed(speed_mps: number, system: DisplayUnitSystem): string {
  if (system === 'metric') {
    return `${speed_mps.toFixed(2)} m/s`
  }
  return `${metersToFeet(speed_mps).toFixed(1)} ft/s`
}

/**
 * Steer label. Positive radians are a left turn, matching the driving math.
 * Near zero it reads "straight" so a tiny leftover angle does not flicker.
 */
export function formatSteer(steer_rad: number): string {
  const degrees = radiansToDegrees(steer_rad)
  if (Math.abs(degrees) < 0.5) {
    return '0° straight'
  }
  const side = degrees > 0 ? 'left' : 'right'
  return `${Math.abs(degrees).toFixed(0)}° ${side}`
}

function formatInchTenths(inchTenths: number): string {
  const wholeInches = Math.floor(inchTenths / INCH_TENTHS)
  const tenth = inchTenths % INCH_TENTHS
  if (tenth === 0) {
    return String(wholeInches)
  }
  return `${wholeInches}.${tenth}`
}
