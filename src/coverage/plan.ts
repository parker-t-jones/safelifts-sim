/**
 * Which platform heights a coverage job checks.
 * The three named heights always run at the chosen spacing.
 * The chart adds steps between them on a coarser grid.
 */
import { clamp } from '../lift/kinematics'
import type { LiftSpec } from '../lift/types'
import type { JobHeight } from './job'
import { SWEEP_SPACING_M, type HeightId } from './types'

export function plannedHeights(
  spec: LiftSpec,
  analysis: HeightId,
  currentHeight_m: number,
): JobHeight[] {
  const named: Array<{ id: HeightId; height_m: number; label: string }> = [
    { id: 'stowed', height_m: spec.platformHeightMin_m, label: 'Stowed' },
    { id: 'threshold', height_m: spec.elevatedThreshold_m, label: 'Elevated threshold' },
    { id: 'max', height_m: spec.platformHeightMax_m, label: 'Max height' },
  ]
  const selected =
    analysis === 'current'
      ? currentHeight_m
      : (named.find((item) => item.id === analysis)?.height_m ?? currentHeight_m)
  const match = named.find((item) => Math.abs(item.height_m - selected) < 0.02)
  if (analysis === 'current' && !match) {
    named.push({ id: 'current', height_m: currentHeight_m, label: 'Current platform' })
  }
  return named.map((item) => ({
    id: item.id,
    height_m: item.height_m,
    label: item.label,
    keepPoints: item.id === analysis || (analysis === 'current' && match?.id === item.id),
    blindSpot: true,
  }))
}

/** Heights for the curve, leaving out the ones plannedHeights already covers. */
export function plannedSweep(spec: LiftSpec, namedHeights_m: readonly number[]): number[] {
  const min = Math.min(spec.platformHeightMin_m, spec.platformHeightMax_m)
  const max = Math.max(spec.platformHeightMin_m, spec.platformHeightMax_m)
  const raw = [min, max, clamp(spec.elevatedThreshold_m, min, max)]
  for (let height = min; height < max; height += 0.5) {
    raw.push(height)
  }
  const unique: number[] = []
  for (const height of raw.sort((a, b) => a - b)) {
    if (unique.some((kept) => Math.abs(kept - height) < 0.02)) {
      continue
    }
    if (namedHeights_m.some((named) => Math.abs(named - height) < 0.02)) {
      continue
    }
    unique.push(height)
  }
  return unique
}

export function sweepSpacing_m(analysisSpacing_m: number): number {
  return Math.max(analysisSpacing_m, SWEEP_SPACING_M)
}
