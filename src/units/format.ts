/**
 * Formats internal lengths for on-screen labels.
 * Imperial is feet and inches (the construction-site default).
 * Metric is meters.
 */
import { METERS_PER_INCH } from './convert'
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

function formatInchTenths(inchTenths: number): string {
  const wholeInches = Math.floor(inchTenths / INCH_TENTHS)
  const tenth = inchTenths % INCH_TENTHS
  if (tenth === 0) {
    return String(wholeInches)
  }
  return `${wholeInches}.${tenth}`
}
