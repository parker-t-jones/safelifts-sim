/**
 * Ray tests against the lift. three-mesh-bvh does the actual cast.
 * One merged mesh keeps a few hundred triangles instead of walking
 * every box on its own.
 */
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  Raycaster,
  Vector3,
  type Intersection,
} from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import type { SolidBox, SolidKind } from './boxes'

export interface RayHit {
  kind: SolidKind
  solidId: string
  distance_m: number
}

export interface Occluder {
  raycast: (
    from_m: readonly [number, number, number],
    to_m: readonly [number, number, number],
    ignoreSolidId: string | null,
  ) => RayHit | null
  dispose: () => void
}

let raycastPatched = false

function patchThreeRaycast(): void {
  if (raycastPatched) {
    return
  }
  Mesh.prototype.raycast = acceleratedRaycast
  raycastPatched = true
}

/**
 * Builds a BVH for every occluding box. Basket volumes are skipped:
 * they stand in for the outline, and the open cage should not block a ray.
 */
export function buildOccluder(solids: readonly SolidBox[]): Occluder {
  const positions: number[] = []
  const faceKind: SolidKind[] = []
  const faceSolid: string[] = []

  for (const solid of solids) {
    if (!solid.occlude) {
      continue
    }
    appendBox(solid, positions, faceKind, faceSolid)
  }

  if (positions.length === 0) {
    return {
      raycast: () => null,
      dispose: () => undefined,
    }
  }

  patchThreeRaycast()
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  // drei ships its own copy of three-mesh-bvh, so the geometry field's
  // type does not match the MeshBVH this file constructs. The raycast
  // only needs the tree to be present at runtime.
  // indirect keeps triangle 0 as the first triangle we appended, so the
  // face index still names the chassis, rail, or module we copied.
  ;(geometry as { boundsTree?: MeshBVH }).boundsTree = new MeshBVH(geometry, { indirect: true })
  const mesh = new Mesh(geometry)
  const raycaster = new Raycaster()
  raycaster.firstHitOnly = false
  const origin = new Vector3()
  const direction = new Vector3()
  const hits: Intersection[] = []

  return {
    raycast(from_m, to_m, ignoreSolidId) {
      direction.set(to_m[0] - from_m[0], to_m[1] - from_m[1], to_m[2] - from_m[2])
      const length = direction.length()
      // Start a little forward so a sensor sitting on its own housing
      // does not count that housing as a hit, and stop short of the
      // sample so the surface the point sits next to is not a block.
      const margin = 0.02
      if (length <= margin * 2) {
        return null
      }
      direction.multiplyScalar(1 / length)
      origin.set(
        from_m[0] + direction.x * margin,
        from_m[1] + direction.y * margin,
        from_m[2] + direction.z * margin,
      )
      raycaster.set(origin, direction)
      raycaster.far = length - margin * 2
      hits.length = 0
      mesh.raycast(raycaster, hits)
      let nearest: RayHit | null = null
      for (const hit of hits) {
        const face = hit.faceIndex ?? 0
        const solidId = faceSolid[face] ?? ''
        // The sensor's own housing can still be grazed just past the margin.
        if (ignoreSolidId && solidId === ignoreSolidId && hit.distance < 0.08) {
          continue
        }
        if (!nearest || hit.distance < nearest.distance_m) {
          nearest = {
            kind: faceKind[face] ?? 'module',
            solidId,
            distance_m: hit.distance,
          }
        }
      }
      return nearest
    },
    dispose() {
      geometry.boundsTree = undefined
      geometry.dispose()
    },
  }
}

function appendBox(
  solid: SolidBox,
  positions: number[],
  faceKind: SolidKind[],
  faceSolid: string[],
): void {
  const geometry = new BoxGeometry(solid.half_m[0] * 2, solid.half_m[1] * 2, solid.half_m[2] * 2)
  const matrix = new Matrix4()
  matrix.makeBasis(
    new Vector3(solid.axisX[0], solid.axisX[1], solid.axisX[2]),
    new Vector3(solid.axisY[0], solid.axisY[1], solid.axisY[2]),
    new Vector3(solid.axisZ[0], solid.axisZ[1], solid.axisZ[2]),
  )
  matrix.setPosition(solid.center_m[0], solid.center_m[1], solid.center_m[2])
  geometry.applyMatrix4(matrix)
  const nonIndexed = geometry.toNonIndexed()
  const array = nonIndexed.getAttribute('position').array
  for (let index = 0; index < array.length; index += 9) {
    for (let offset = 0; offset < 9; offset += 1) {
      positions.push(array[index + offset])
    }
    faceKind.push(solid.kind)
    faceSolid.push(solid.id)
  }
  nonIndexed.dispose()
  geometry.dispose()
}
