/**
 * Messages between the page and the coverage worker.
 * Everything here is plain data so it can be copied to the worker.
 */
import type { LiftSpec } from '../lift/types'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import type { SensorSpec } from '../sensors/types'
import type { CoverageCloud, HeightId, HeightReport, OperatorSpec, SweepPoint } from './types'

export interface JobHeight {
  id: HeightId
  height_m: number
  label: string
  keepPoints: boolean
  /** The chart samples skip the blind-spot search. The three named heights do not. */
  blindSpot: boolean
}

export interface CoverageJob {
  jobId: number
  spec: LiftSpec
  modules: SensorModule[]
  placements: ModulePlacement[]
  sensorSpecs: SensorSpec[]
  operator: OperatorSpec
  requestedEnvelope_m: number
  overhead_m: number
  spacing_m: number
  heights: JobHeight[]
  /** Extra heights for the chart, already excluding the named ones. */
  sweepHeights_m: number[]
  sweepSpacing_m: number
}

export interface CoverageProgressMessage {
  type: 'progress'
  jobId: number
  fraction: number
  label: string
}

export interface CoveragePartialMessage {
  type: 'partial'
  jobId: number
  report: HeightReport
  cloud: CoverageCloud | null
}

export interface CoverageDoneMessage {
  type: 'done'
  jobId: number
  reports: HeightReport[]
  sweep: SweepPoint[]
  cloud: CoverageCloud | null
}

export interface CoverageErrorMessage {
  type: 'error'
  jobId: number
  message: string
}

export type CoverageWorkerMessage =
  | CoverageProgressMessage
  | CoveragePartialMessage
  | CoverageDoneMessage
  | CoverageErrorMessage
