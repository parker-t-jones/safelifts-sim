/**
 * Coverage settings and results. Distances are meters.
 * The worker and the panel both use these plain objects.
 */
/** Default shell around the lift. The effective shell can grow past this. */
export const DEFAULT_ENVELOPE_M = 1

/** Air directly above the guardrails. This does not auto-expand. */
export const DEFAULT_OVERHEAD_M = 1

/** The shell must reach at least this far past the warning distance. */
export const SHELL_PAST_WARNING_M = 0.25

/** Everyday grid. About 2 inches. */
export const GRID_DEFAULT_M = 0.05

/** Finer grid. About 1 inch. Tight door gaps are not what this grid is for. */
export const GRID_FINE_M = 0.025

/** Coarsest spacing the form will accept. Wider cells finish faster. */
export const GRID_COARSE_MAX_M = 0.5

/** Chart samples between the three named heights use this spacing. */
export const SWEEP_SPACING_M = 0.1

export const REGIONS = ['front', 'rear', 'left', 'right', 'overhead', 'floor'] as const

export type RegionId = (typeof REGIONS)[number]

export const REGION_LABELS: Record<RegionId, string> = {
  front: 'Front',
  rear: 'Rear',
  left: 'Left',
  right: 'Right',
  overhead: 'Overhead',
  floor: 'Floor near chassis',
}

export type HeightId = 'stowed' | 'threshold' | 'max' | 'current'

/** Inside the warning distance, or between that distance and the shell edge. */
export type BandId = 'inTime' | 'tooLate'

/** 0 = nothing aimed here, 1 = blocked by the lift or operator, 2 = seen. */
export type PointStatus = 0 | 1 | 2

export interface BandStats {
  points: number
  /** Seen by at least one sensor, with a clear line of sight. */
  covered: number
  /** A sensor was aimed here, but the lift or the operator blocked every ray. */
  selfOccluded: number
  /** No enabled sensor looks at this point within range. */
  uncovered: number
}

export interface RegionStats {
  inTime: BandStats
  tooLate: BandStats
}

export interface BlindSpot {
  points: number
  size_m: [number, number, number]
  center_m: [number, number, number]
  region: RegionId
}

export interface RayBlockCounts {
  chassis: number
  deck: number
  rail: number
  scissor: number
  module: number
  operator: number
}

export interface FalseAlarm {
  placementId: string
  sensorId: string
  /** Placement and sensor names, already joined for the panel. */
  label: string
}

export interface OverlapHistogram {
  /** Points no sensor could see. Self-occluded points are not in this bucket. */
  zero: number
  one: number
  two: number
  threePlus: number
  selfOccluded: number
}

export interface HeightReport {
  id: HeightId
  height_m: number
  spacing_m: number
  /** Longest warning distance at this height. Null when braking cannot stop the lift. */
  warningDistance_m: number | null
  /** Which sensor set that warning distance. Null when no sensor delay was included. */
  warningLabel: string | null
  requestedEnvelope_m: number
  effectiveEnvelope_m: number
  expanded: boolean
  overhead_m: number
  sampleCount: number
  inTime: BandStats
  tooLate: BandStats
  regions: Record<RegionId, RegionStats>
  histogram: OverlapHistogram
  blindSpot: BlindSpot | null
  rays: RayBlockCounts
  falseAlarms: FalseAlarm[]
}

export interface SweepPoint {
  height_m: number
  /** Null when that height has no samples past the warning distance. */
  inTimeCoverage: number | null
  spacing_m: number
}

export interface CoverageCloud {
  heightId: HeightId
  height_m: number
  spacing_m: number
  positions: Float32Array
  /** How many sensors see this point. */
  counts: Uint8Array
  status: Uint8Array
}

export interface OperatorSpec {
  enabled: boolean
  /** Standing height above the platform floor. */
  height_m: number
  /** Forward offset from the platform center. */
  x_m: number
  /** Right offset from the platform center. */
  z_m: number
}

export const DEFAULT_OPERATOR: OperatorSpec = {
  enabled: false,
  height_m: 1.75,
  x_m: 0,
  z_m: 0,
}

export function emptyBand(): BandStats {
  return { points: 0, covered: 0, selfOccluded: 0, uncovered: 0 }
}

export function emptyRays(): RayBlockCounts {
  return { chassis: 0, deck: 0, rail: 0, scissor: 0, module: 0, operator: 0 }
}

/** Covered samples divided by every sample in the band. Null when the band is empty. */
export function coverageFraction(band: BandStats): number | null {
  if (band.points === 0) {
    return null
  }
  return band.covered / band.points
}
