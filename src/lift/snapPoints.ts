/**
 * Named places a sensor module can snap to.
 *
 * Front is lift +X. Right is lift +Z. Left is −Z.
 * Chassis points sit on the top face of the chassis, in the lift frame.
 * Guardrail points sit on top of the rails, in the platform frame, so they
 * rise and fall with the platform. They follow the main platform rectangle.
 * The extension deck does not add snap points.
 */
import type { LiftSpec } from './types'

export type SnapFrame = 'lift' | 'platform'

export interface SnapPoint {
  id: string
  label: string
  frame: SnapFrame
  position_m: [number, number, number]
}

export function snapPointsFor(spec: LiftSpec): SnapPoint[] {
  const chassis = rectanglePoints({
    idPrefix: 'chassis',
    labelPrefix: 'Chassis',
    frame: 'lift',
    halfX_m: spec.chassisLength_m / 2,
    halfZ_m: spec.chassisWidth_m / 2,
    y_m: spec.chassisHeight_m,
  })
  const rails = rectanglePoints({
    idPrefix: 'guardrail',
    labelPrefix: 'Guardrail',
    frame: 'platform',
    halfX_m: spec.platformLength_m / 2,
    halfZ_m: spec.platformWidth_m / 2,
    y_m: spec.guardrailHeight_m,
  })
  return [...chassis, ...rails]
}

function rectanglePoints(args: {
  idPrefix: string
  labelPrefix: string
  frame: SnapFrame
  halfX_m: number
  halfZ_m: number
  y_m: number
}): SnapPoint[] {
  const { idPrefix, labelPrefix, frame, halfX_m, halfZ_m, y_m } = args
  // Listed front-to-back so the names stay obvious in the toggle and tests.
  const spots: Array<{ id: string; label: string; x: number; z: number }> = [
    { id: 'front-left', label: 'front-left', x: halfX_m, z: -halfZ_m },
    { id: 'front-right', label: 'front-right', x: halfX_m, z: halfZ_m },
    { id: 'rear-left', label: 'rear-left', x: -halfX_m, z: -halfZ_m },
    { id: 'rear-right', label: 'rear-right', x: -halfX_m, z: halfZ_m },
    { id: 'front-mid', label: 'front midpoint', x: halfX_m, z: 0 },
    { id: 'rear-mid', label: 'rear midpoint', x: -halfX_m, z: 0 },
    { id: 'left-mid', label: 'left midpoint', x: 0, z: -halfZ_m },
    { id: 'right-mid', label: 'right midpoint', x: 0, z: halfZ_m },
  ]
  return spots.map((spot) => ({
    id: `${idPrefix}-${spot.id}`,
    label: `${labelPrefix} ${spot.label}`,
    frame,
    position_m: [spot.x, y_m, spot.z],
  }))
}
