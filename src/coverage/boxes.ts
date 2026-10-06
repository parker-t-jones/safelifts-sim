/**
 * Boxes in the lift frame. Axis-aligned boxes use the lift axes.
 * A rotated box (a module housing, a scissor bar) stores its own axes.
 * No three.js here, so the shell tests stay plain arithmetic.
 */

export type SolidKind = 'chassis' | 'deck' | 'rail' | 'scissor' | 'module' | 'operator' | 'basket'

export interface SolidBox {
  id: string
  kind: SolidKind
  /**
   * Counts toward "how far is this point from the lift?"
   * The basket volumes do this. The thin rail tubes do not,
   * because the basket face is the outline a door frame would meet.
   */
  surface: boolean
  /** Blocks a coverage ray. The basket interior is open air, so it does not. */
  occlude: boolean
  center_m: [number, number, number]
  half_m: [number, number, number]
  axisX: [number, number, number]
  axisY: [number, number, number]
  axisZ: [number, number, number]
}

export const AXIS_X: [number, number, number] = [1, 0, 0]
export const AXIS_Y: [number, number, number] = [0, 1, 0]
export const AXIS_Z: [number, number, number] = [0, 0, 1]

export function alignedBox(
  id: string,
  kind: SolidKind,
  surface: boolean,
  occlude: boolean,
  center_m: [number, number, number],
  size_m: [number, number, number],
): SolidBox {
  return {
    id,
    kind,
    surface,
    occlude,
    center_m,
    half_m: [Math.abs(size_m[0]) / 2, Math.abs(size_m[1]) / 2, Math.abs(size_m[2]) / 2],
    axisX: AXIS_X,
    axisY: AXIS_Y,
    axisZ: AXIS_Z,
  }
}

export function dot(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function cross(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

export function normalize(v: readonly [number, number, number]): [number, number, number] {
  const length = Math.hypot(v[0], v[1], v[2])
  if (length < 1e-12) {
    return [1, 0, 0]
  }
  return [v[0] / length, v[1] / length, v[2] / length]
}

/** A bar from `from` to `to`, square in cross section. Used for scissors. */
export function barBox(
  id: string,
  kind: SolidKind,
  from_m: readonly [number, number, number],
  to_m: readonly [number, number, number],
  thickness_m: number,
): SolidBox {
  const delta: [number, number, number] = [
    to_m[0] - from_m[0],
    to_m[1] - from_m[1],
    to_m[2] - from_m[2],
  ]
  const axisX = normalize(delta)
  const helper: [number, number, number] = Math.abs(axisX[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const axisZ = normalize(cross(axisX, helper))
  const axisY = cross(axisZ, axisX)
  const length = Math.hypot(delta[0], delta[1], delta[2])
  const halfThick = Math.max(thickness_m, 0) / 2
  return {
    id,
    kind,
    surface: false,
    occlude: true,
    center_m: [
      (from_m[0] + to_m[0]) / 2,
      (from_m[1] + to_m[1]) / 2,
      (from_m[2] + to_m[2]) / 2,
    ],
    half_m: [length / 2, halfThick, halfThick],
    axisX,
    axisY,
    axisZ,
  }
}

export function toLocal(
  point_m: readonly [number, number, number],
  box: SolidBox,
): [number, number, number] {
  const dx = point_m[0] - box.center_m[0]
  const dy = point_m[1] - box.center_m[1]
  const dz = point_m[2] - box.center_m[2]
  return [
    dx * box.axisX[0] + dy * box.axisX[1] + dz * box.axisX[2],
    dx * box.axisY[0] + dy * box.axisY[1] + dz * box.axisY[2],
    dx * box.axisZ[0] + dy * box.axisZ[1] + dz * box.axisZ[2],
  ]
}

export function pointInsideBox(point_m: readonly [number, number, number], box: SolidBox): boolean {
  const [x, y, z] = toLocal(point_m, box)
  return Math.abs(x) <= box.half_m[0] && Math.abs(y) <= box.half_m[1] && Math.abs(z) <= box.half_m[2]
}

export interface ClosestFace {
  distance_m: number
  /** Outward normal of the closest face, in the lift frame. Zero when the point is inside. */
  normal: [number, number, number]
}

/**
 * Distance from a point to a box, and which way the closest face points.
 * Inside the box the distance is 0.
 */
export function closestFace(point_m: readonly [number, number, number], box: SolidBox): ClosestFace {
  const local = toLocal(point_m, box)
  const clamped: [number, number, number] = [
    clamp(local[0], -box.half_m[0], box.half_m[0]),
    clamp(local[1], -box.half_m[1], box.half_m[1]),
    clamp(local[2], -box.half_m[2], box.half_m[2]),
  ]
  const delta: [number, number, number] = [
    local[0] - clamped[0],
    local[1] - clamped[1],
    local[2] - clamped[2],
  ]
  const distance_m = Math.hypot(delta[0], delta[1], delta[2])
  if (distance_m < 1e-8) {
    return { distance_m: 0, normal: [0, 0, 0] }
  }
  // The largest leftover is the face the point sits opposite.
  let axis = 0
  if (Math.abs(delta[1]) > Math.abs(delta[axis])) {
    axis = 1
  }
  if (Math.abs(delta[2]) > Math.abs(delta[axis])) {
    axis = 2
  }
  const sign = delta[axis] >= 0 ? 1 : -1
  const localNormal: [number, number, number] = [0, 0, 0]
  localNormal[axis] = sign
  return { distance_m, normal: localNormalToWorld(localNormal, box) }
}

function localNormalToWorld(
  local: readonly [number, number, number],
  box: SolidBox,
): [number, number, number] {
  return normalize([
    box.axisX[0] * local[0] + box.axisY[0] * local[1] + box.axisZ[0] * local[2],
    box.axisX[1] * local[0] + box.axisY[1] * local[1] + box.axisZ[1] * local[2],
    box.axisX[2] * local[0] + box.axisY[2] * local[1] + box.axisZ[2] * local[2],
  ])
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}
