/**
 * Pure numbers derived from a sensor spec. No React and no three.js,
 * so the formulas can be unit tested.
 *
 * The zone footprint matches SPEC 5.3: 2 · d · tan(zone angle / 2),
 * measured on a plane at distance d along the sensor's forward axis.
 * effectiveMax matches SPEC 6.1 and is capped at rangeMax.
 */
import { degreesToRadians } from '../units/convert'
import type { ResolutionMode, SensorSpec } from './types'

/** Distances at which the Sensors tab shows a zone footprint. */
export const ZONE_FOOTPRINT_DISTANCES_M = [0.5, 1, 2, 3, 4] as const

/**
 * Approximate reflectivities for the range table. These are not datasheet
 * numbers. The assumptions panel says so. A later scene can edit them
 * per obstacle.
 */
export const APPROXIMATE_MATERIALS: Array<{ name: string; reflectivity: number }> = [
  { name: 'White reference', reflectivity: 0.88 },
  { name: 'Bare concrete', reflectivity: 0.4 },
  { name: 'Raw wood', reflectivity: 0.3 },
  { name: 'Dark clothing', reflectivity: 0.1 },
  { name: 'Black rubber', reflectivity: 0.05 },
]

/** Lowest reflectivity in the table. Coverage assumes this until another material is chosen. */
export function darkestMaterial(): { name: string; reflectivity: number } {
  let darkest = APPROXIMATE_MATERIALS[0]
  for (const material of APPROXIMATE_MATERIALS) {
    if (material.reflectivity < darkest.reflectivity) {
      darkest = material
    }
  }
  return darkest
}

/** The named row, or the darkest material when the name is not in the table. */
export function materialByName(name: string): { name: string; reflectivity: number } {
  return APPROXIMATE_MATERIALS.find((material) => material.name === name) ?? darkestMaterial()
}

export function activeMode(spec: SensorSpec): ResolutionMode | null {
  return spec.modes.find((mode) => mode.id === spec.activeModeId) ?? spec.modes[0] ?? null
}

/** One update period. Null when the rate is not positive, so we never divide by zero. */
export function updatePeriod_s(updateRate_hz: number): number | null {
  if (!(updateRate_hz > 0)) {
    return null
  }
  return 1 / updateRate_hz
}

/**
 * Time a warning distance adds before the operator reacts:
 * framesToConfirm update periods, then processing latency.
 * A zero rate has no period, so the delay is undefined.
 */
export function sensorDelay_s(
  updateRate_hz: number,
  processingLatency_s: number,
  framesToConfirm: number,
): number | null {
  const period_s = updatePeriod_s(updateRate_hz)
  if (period_s === null) {
    return null
  }
  return Math.max(0, framesToConfirm) * period_s + Math.max(0, processingLatency_s)
}

/** Angular width of one zone. Null when the zone count is not positive. */
export function zoneAngle_deg(fov_deg: number, zones: number): number | null {
  if (!(zones > 0)) {
    return null
  }
  return Math.abs(fov_deg) / zones
}

/** Width of one zone on a plane at distance_m. */
export function zoneFootprint_m(distance_m: number, zoneAngle_deg: number): number {
  const half_rad = degreesToRadians(Math.abs(zoneAngle_deg)) * 0.5
  return 2 * Math.abs(distance_m) * Math.tan(half_rad)
}

/**
 * Farthest range that still returns enough signal at this reflectivity.
 *
 * Returned signal is proportional to ρ / d². The distance at which that
 * signal matches the reference target is therefore
 * rangeMax × √(ρ / ρ_ref), not a linear fraction of the reflectivity.
 * Null when the reference reflectivity is 0 or negative, because the
 * formula would divide by zero or flip the sign.
 * Results above rangeMax are capped at rangeMax.
 */
export function effectiveMax_m(
  rangeMax_m: number,
  reflectivity: number,
  referenceReflectivity: number,
): number | null {
  if (!(referenceReflectivity > 0) || reflectivity < 0) {
    return null
  }
  const rangeMax = Math.max(0, rangeMax_m)
  const scaled = rangeMax * Math.sqrt(reflectivity / referenceReflectivity)
  return Math.min(rangeMax, scaled)
}

export const AMBIENT_LIGHTS = ['indoor', 'overcast', 'directSun'] as const

export type AmbientLight = (typeof AMBIENT_LIGHTS)[number]

export const AMBIENT_LABELS: Record<AmbientLight, string> = {
  indoor: 'Indoor',
  overcast: 'Overcast',
  directSun: 'Direct sun',
}

/**
 * Multipliers on ToF range after the material range is known.
 * Approximate stand-ins, not datasheet numbers. Indoor is 1 because
 * rangeMax and a measured table are both taken as indoor figures.
 */
export const AMBIENT_RANGE_FACTOR: Record<AmbientLight, number> = {
  indoor: 1,
  overcast: 0.75,
  directSun: 0.5,
}

/**
 * ToF distance used for "can see".
 * A measured row for this material replaces the square-root formula.
 * Ambient light then multiplies that distance. Radar is unchanged.
 */
export function tofSeeingRange_m(
  spec: SensorSpec,
  material: string,
  reflectivity: number,
  ambient: AmbientLight,
): number {
  if (!spec.tof) {
    return Math.max(0, spec.rangeMax_m)
  }
  const measured = spec.measuredRanges?.find((row) => row.material === material)
  const fromFormula = effectiveMax_m(spec.rangeMax_m, reflectivity, spec.tof.referenceReflectivity)
  const base =
    measured && Number.isFinite(measured.rangeMax_m)
      ? Math.max(0, measured.rangeMax_m)
      : (fromFormula ?? Math.max(0, spec.rangeMax_m))
  return base * AMBIENT_RANGE_FACTOR[ambient]
}

/**
 * Center of one zone on the plane at range_m along sensor +X.
 * Column 0 is the sensor's right (+Z). Row 0 is down (−Y).
 * Positive horizontal angle points left, toward sensor −Z.
 */
export function zoneCenterOnPlane(
  range_m: number,
  fovH_deg: number,
  fovV_deg: number,
  zonesX: number,
  zonesY: number,
  column: number,
  row: number,
): [number, number, number] | null {
  if (!(zonesX > 0) || !(zonesY > 0)) {
    return null
  }
  const range = Math.abs(range_m)
  const alpha_deg = -Math.abs(fovH_deg) / 2 + (column + 0.5) * (Math.abs(fovH_deg) / zonesX)
  const beta_deg = -Math.abs(fovV_deg) / 2 + (row + 0.5) * (Math.abs(fovV_deg) / zonesY)
  return [
    range,
    range * Math.tan(degreesToRadians(beta_deg)),
    -range * Math.tan(degreesToRadians(alpha_deg)),
  ]
}
