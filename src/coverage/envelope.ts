/**
 * Which sample points belong in the danger shell, and which region and
 * band each one falls in. The grid is aligned to the lift origin.
 */
import type { LiftSpec } from '../lift/types'
import { closestFace, pointInsideBox, type SolidBox } from './boxes'
import { usesDriveWarning, type BandId, type RegionId } from './types'

export interface Sample {
  x: number
  y: number
  z: number
  ix: number
  iy: number
  iz: number
  region: RegionId
  band: BandId
  distance_m: number
}

export interface EnvelopeQuery {
  spec: LiftSpec
  platformHeight_m: number
  solids: readonly SolidBox[]
  envelope_m: number
  overhead_m: number
  /** Null means braking cannot stop the lift, so every sample is too late. */
  warningDistance_m: number | null
}

interface Located {
  region: RegionId
  band: BandId
  distance_m: number
}

/**
 * One grid point, or null when it is inside the lift, under the floor,
 * or farther out than the shell and the overhead column.
 */
export function locatePoint(
  point_m: readonly [number, number, number],
  query: EnvelopeQuery,
): Located | null {
  const [x, y, z] = point_m
  if (y < -1e-6) {
    return null
  }
  if (insideLift(point_m, query)) {
    return null
  }

  const railTop = query.platformHeight_m + Math.max(0, query.spec.guardrailHeight_m)
  if (y > railTop && inDeckFootprint(x, z, query.spec)) {
    const gap = y - railTop
    if (gap > Math.max(0, query.overhead_m)) {
      return null
    }
    return {
      region: 'overhead',
      distance_m: gap,
      // Raising the platform into this air is not a drive stop, so it is not too-late or in-time.
      band: 'seen',
    }
  }

  const nearest = nearestSurface(point_m, query.solids)
  if (!nearest || nearest.distance_m > query.envelope_m) {
    return null
  }

  const region = regionFor(point_m, nearest.normal, query.spec)
  return {
    region,
    distance_m: nearest.distance_m,
    // Only the drive direction uses the stopping distance. Left, right, and the
    // floor ring are seen or unseen, because the lift does not drive into them.
    band: usesDriveWarning(region) ? bandFor(nearest.distance_m, query.warningDistance_m) : 'seen',
  }
}

export function sampleEnvelope(query: EnvelopeQuery, spacing_m: number): Sample[] {
  const spacing = Math.max(spacing_m, 1e-4)
  const bounds = searchBounds(query, spacing)
  const samples: Sample[] = []
  const i0 = Math.ceil(bounds.minX / spacing - 1e-9)
  const i1 = Math.floor(bounds.maxX / spacing + 1e-9)
  const j0 = Math.ceil(Math.max(0, bounds.minY) / spacing - 1e-9)
  const j1 = Math.floor(bounds.maxY / spacing + 1e-9)
  const k0 = Math.ceil(bounds.minZ / spacing - 1e-9)
  const k1 = Math.floor(bounds.maxZ / spacing + 1e-9)

  for (let iy = j0; iy <= j1; iy += 1) {
    const y = iy * spacing
    for (let ix = i0; ix <= i1; ix += 1) {
      const x = ix * spacing
      for (let iz = k0; iz <= k1; iz += 1) {
        const z = iz * spacing
        const located = locatePoint([x, y, z], query)
        if (!located) {
          continue
        }
        samples.push({
          x,
          y,
          z,
          ix,
          iy,
          iz,
          region: located.region,
          band: located.band,
          distance_m: located.distance_m,
        })
      }
    }
  }
  return samples
}

function bandFor(distance_m: number, warning_m: number | null): BandId {
  if (warning_m === null) {
    return 'tooLate'
  }
  return distance_m <= warning_m ? 'tooLate' : 'inTime'
}

function insideLift(point_m: readonly [number, number, number], query: EnvelopeQuery): boolean {
  for (const box of query.solids) {
    if (pointInsideBox(point_m, box)) {
      return true
    }
  }
  return false
}

function inDeckFootprint(x: number, z: number, spec: LiftSpec): boolean {
  const halfX = spec.platformLength_m / 2
  const halfZ = spec.platformWidth_m / 2
  const inMain = Math.abs(x) <= halfX && Math.abs(z) <= halfZ
  const extension = Math.max(0, spec.extensionDeckLength_m)
  const inExtension = x >= halfX && x <= halfX + extension && Math.abs(z) <= halfZ
  return inMain || inExtension
}

function regionFor(
  point_m: readonly [number, number, number],
  normal: readonly [number, number, number],
  spec: LiftSpec,
): RegionId {
  const [, y, z] = point_m
  const halfZ = spec.chassisWidth_m / 2
  const halfX = spec.chassisLength_m / 2
  const outsideChassis = Math.abs(point_m[0]) > halfX || Math.abs(z) > halfZ
  if (y <= spec.chassisHeight_m && outsideChassis) {
    return 'floor'
  }
  const ax = Math.abs(normal[0])
  const ay = Math.abs(normal[1])
  const az = Math.abs(normal[2])
  if (ay >= ax && ay >= az) {
    // Above or below a face. Use the horizontal direction away from the lift center.
    if (Math.abs(point_m[0]) >= Math.abs(z)) {
      return point_m[0] >= 0 ? 'front' : 'rear'
    }
    return z >= 0 ? 'right' : 'left'
  }
  if (ax >= az) {
    return normal[0] >= 0 ? 'front' : 'rear'
  }
  return normal[2] >= 0 ? 'right' : 'left'
}

interface Nearest {
  distance_m: number
  normal: [number, number, number]
}

function nearestSurface(point_m: readonly [number, number, number], solids: readonly SolidBox[]): Nearest | null {
  let best: Nearest | null = null
  for (const box of solids) {
    if (!box.surface) {
      continue
    }
    const face = closestFace(point_m, box)
    if (!best || face.distance_m < best.distance_m) {
      best = { distance_m: face.distance_m, normal: face.normal }
    }
  }
  return best
}

function searchBounds(query: EnvelopeQuery, spacing: number): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
} {
  const { spec } = query
  const pad = query.envelope_m + spacing
  const extension = Math.max(0, spec.extensionDeckLength_m)
  const front = Math.max(spec.chassisLength_m / 2, spec.platformLength_m / 2 + extension)
  const back = Math.max(spec.chassisLength_m / 2, spec.platformLength_m / 2)
  const side = Math.max(spec.chassisWidth_m / 2, spec.platformWidth_m / 2)
  const railTop = query.platformHeight_m + Math.max(0, spec.guardrailHeight_m)
  const bounds = {
    minX: -back - pad,
    maxX: front + pad,
    minY: 0,
    maxY: Math.max(spec.chassisHeight_m, query.platformHeight_m, railTop + Math.max(0, query.overhead_m)) + spacing,
    minZ: -side - pad,
    maxZ: side + pad,
  }
  // A module placed away from the body still grows the shell around its housing.
  for (const box of query.solids) {
    if (!box.surface) {
      continue
    }
    const reach = boxReach(box)
    bounds.minX = Math.min(bounds.minX, box.center_m[0] - reach[0] - pad)
    bounds.maxX = Math.max(bounds.maxX, box.center_m[0] + reach[0] + pad)
    bounds.minY = Math.min(bounds.minY, box.center_m[1] - reach[1] - pad)
    bounds.maxY = Math.max(bounds.maxY, box.center_m[1] + reach[1] + pad)
    bounds.minZ = Math.min(bounds.minZ, box.center_m[2] - reach[2] - pad)
    bounds.maxZ = Math.max(bounds.maxZ, box.center_m[2] + reach[2] + pad)
  }
  return bounds
}

/** Half-size of a rotated box along the lift axes. */
function boxReach(box: SolidBox): [number, number, number] {
  return [
    Math.abs(box.axisX[0]) * box.half_m[0] + Math.abs(box.axisY[0]) * box.half_m[1] + Math.abs(box.axisZ[0]) * box.half_m[2],
    Math.abs(box.axisX[1]) * box.half_m[0] + Math.abs(box.axisY[1]) * box.half_m[1] + Math.abs(box.axisZ[1]) * box.half_m[2],
    Math.abs(box.axisX[2]) * box.half_m[0] + Math.abs(box.axisY[2]) * box.half_m[1] + Math.abs(box.axisZ[2]) * box.half_m[2],
  ]
}
