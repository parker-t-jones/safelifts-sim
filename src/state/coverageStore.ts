/**
 * Coverage settings and the latest worker result.
 * The math lives in src/coverage/. This store only holds the numbers
 * the panel and the 3D view read.
 */
import { create } from 'zustand'
import {
  DEFAULT_ENVELOPE_M,
  DEFAULT_OPERATOR,
  DEFAULT_OVERHEAD_M,
  GRID_COARSE_MAX_M,
  GRID_DEFAULT_M,
  GRID_FINE_M,
  type CoverageCloud,
  type HeightId,
  type HeightReport,
  type OperatorSpec,
  type SweepPoint,
} from '../coverage/types'
import { darkestMaterial } from '../sensors/derived'

interface CoverageState {
  envelope_m: number
  overhead_m: number
  spacing_m: number
  /** Name of a row in the reflectivity table. "Can see" uses that material. */
  targetMaterial: string
  showCloud: boolean
  showSlice: boolean
  showMap: boolean
  sliceY_m: number
  analysis: HeightId
  operator: OperatorSpec
  status: 'idle' | 'running' | 'done' | 'error'
  progress: number
  progressLabel: string
  error: string | null
  reports: HeightReport[]
  sweep: SweepPoint[]
  cloud: CoverageCloud | null
  setEnvelope: (envelope_m: number) => void
  setOverhead: (overhead_m: number) => void
  setSpacing: (spacing_m: number) => void
  setTargetMaterial: (targetMaterial: string) => void
  setShowCloud: (showCloud: boolean) => void
  setShowSlice: (showSlice: boolean) => void
  setShowMap: (showMap: boolean) => void
  setSliceY: (sliceY_m: number) => void
  setAnalysis: (analysis: HeightId) => void
  setOperator: (patch: Partial<OperatorSpec>) => void
  markRunning: () => void
  setProgress: (progress: number, progressLabel: string) => void
  addPartial: (report: HeightReport, cloud: CoverageCloud | null) => void
  setResult: (reports: HeightReport[], sweep: SweepPoint[], cloud: CoverageCloud | null) => void
  setError: (error: string) => void
}

export const useCoverageStore = create<CoverageState>((set) => ({
  envelope_m: DEFAULT_ENVELOPE_M,
  overhead_m: DEFAULT_OVERHEAD_M,
  spacing_m: GRID_DEFAULT_M,
  targetMaterial: darkestMaterial().name,
  showCloud: true,
  showSlice: true,
  showMap: true,
  sliceY_m: 1,
  analysis: 'stowed',
  operator: DEFAULT_OPERATOR,
  status: 'idle',
  progress: 0,
  progressLabel: '',
  error: null,
  reports: [],
  sweep: [],
  cloud: null,

  setEnvelope: (envelope_m) => set({ envelope_m: Math.max(0, envelope_m) }),
  setOverhead: (overhead_m) => set({ overhead_m: Math.max(0, overhead_m) }),
  setSpacing: (spacing_m) =>
    set({ spacing_m: clamp(spacing_m, GRID_FINE_M, GRID_COARSE_MAX_M) }),
  setTargetMaterial: (targetMaterial) => set({ targetMaterial }),
  setShowCloud: (showCloud) => set({ showCloud }),
  setShowSlice: (showSlice) => set({ showSlice }),
  setShowMap: (showMap) => set({ showMap }),
  setSliceY: (sliceY_m) => set({ sliceY_m: Math.max(0, sliceY_m) }),
  setAnalysis: (analysis) => set({ analysis }),
  setOperator: (patch) => set((state) => ({ operator: { ...state.operator, ...patch } })),
  markRunning: () => set({ status: 'running', error: null, reports: [], sweep: [], cloud: null }),
  setProgress: (progress, progressLabel) => set({ progress, progressLabel, status: 'running' }),
  addPartial: (report, cloud) =>
    set((state) => ({
      reports: [...state.reports.filter((item) => item.id !== report.id || item.height_m !== report.height_m), report],
      cloud: cloud ?? state.cloud,
      status: 'running',
    })),
  setResult: (reports, sweep, cloud) =>
    set({ reports, sweep, cloud, status: 'done', progress: 1, progressLabel: '', error: null }),
  setError: (error) => set({ status: 'error', error, progressLabel: '' }),
}))

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}
