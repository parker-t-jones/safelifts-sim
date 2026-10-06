/**
 * Pyramid and zone-ray geometry in the sensor frame.
 * The pyramid ends on the plane at max range along +X, so its corners
 * are slightly farther from the sensor than max range.
 */
import { degreesToRadians } from '../units/convert'
import { zoneCenterOnPlane } from './derived'

/** Skip ray lines above this many zones so a huge grid cannot freeze the view. */
export const MAX_ZONE_RAYS = 1024

export function pyramidPositions(range_m: number, fovH_deg: number, fovV_deg: number): Float32Array | null {
  const range = Math.abs(range_m)
  if (range === 0) {
    return null
  }
  const halfWidth = range * Math.tan(degreesToRadians(Math.abs(fovH_deg)) * 0.5)
  const halfHeight = range * Math.tan(degreesToRadians(Math.abs(fovV_deg)) * 0.5)
  const apex: [number, number, number] = [0, 0, 0]
  const far: Array<[number, number, number]> = [
    [range, halfHeight, -halfWidth],
    [range, halfHeight, halfWidth],
    [range, -halfHeight, halfWidth],
    [range, -halfHeight, -halfWidth],
  ]
  const corners: Array<[number, number, number]> = []
  for (let index = 0; index < 4; index += 1) {
    pushTriangle(corners, apex, far[index], far[(index + 1) % 4])
  }
  pushTriangle(corners, far[0], far[1], far[2])
  pushTriangle(corners, far[0], far[2], far[3])
  return new Float32Array(corners.flat())
}

export function zoneRayPositions(
  range_m: number,
  fovH_deg: number,
  fovV_deg: number,
  zonesX: number,
  zonesY: number,
): Float32Array | null {
  if (zonesX * zonesY > MAX_ZONE_RAYS) {
    return null
  }
  const values: number[] = []
  for (let column = 0; column < zonesX; column += 1) {
    for (let row = 0; row < zonesY; row += 1) {
      const center = zoneCenterOnPlane(range_m, fovH_deg, fovV_deg, zonesX, zonesY, column, row)
      if (!center) {
        return null
      }
      values.push(0, 0, 0, center[0], center[1], center[2])
    }
  }
  return new Float32Array(values)
}

function pushTriangle(
  out: Array<[number, number, number]>,
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): void {
  out.push(a, b, c)
}
