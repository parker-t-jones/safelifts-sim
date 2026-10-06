/**
 * Imported-mesh collision. The mesh BVH is in the file's local frame.
 * Each lift part is turned into a local box, which is a little larger
 * than the part once the lift has yawed, so a stop can come slightly early.
 */
import { Box3, Matrix4, Vector3 } from 'three'

const IDENTITY = new Matrix4()
import { mountMatrix } from '../modules/mountMatrix'
import type { LiftPose, LiftSpec } from '../lift/types'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import type { OrientedBox } from './boxes'
import { liftWorldBoxes } from './collision'
import { getImportedMesh } from './imports'
import type { Obstacle } from './types'

export function importedMeshHits(
  pose: LiftPose,
  spec: LiftSpec,
  obstacles: readonly Obstacle[],
  modules: readonly SensorModule[],
  placements: readonly ModulePlacement[],
): string[] {
  const imported = obstacles.filter((obstacle) => obstacle.type === 'importedMesh' && getImportedMesh(obstacle.id))
  if (imported.length === 0) {
    return []
  }
  const liftBoxes = liftWorldBoxes(pose, spec, modules, placements)
  const hits: string[] = []
  for (const obstacle of imported) {
    const mesh = getImportedMesh(obstacle.id)
    if (!mesh) {
      continue
    }
    const inverse = meshMatrix(obstacle).invert()
    // The box is already in the mesh frame, so the extra transform is identity.
    if (liftBoxes.some((box) => mesh.bvh.intersectsBox(localBounds(box, inverse), IDENTITY))) {
      hits.push(obstacle.id)
    }
  }
  return hits
}

function meshMatrix(obstacle: Obstacle): Matrix4 {
  const scale = obstacle.dimensions_m.scale ?? 1
  const matrix = mountMatrix(obstacle.position_m, obstacle.yawPitchRoll_deg)
  matrix.scale(new Vector3(scale, scale, scale))
  return matrix
}

/**
 * Axis-aligned bounds of a lift part after it is moved into the mesh frame.
 * The box is already in mesh space, so intersectsBox is given an identity matrix.
 */
function localBounds(box: OrientedBox, inverse: Matrix4): Box3 {
  const bounds = new Box3()
  const corner = new Vector3()
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corner.set(
          box.center_m[0] + sx * box.axisX[0] * box.half_m[0] + sy * box.axisY[0] * box.half_m[1] + sz * box.axisZ[0] * box.half_m[2],
          box.center_m[1] + sx * box.axisX[1] * box.half_m[0] + sy * box.axisY[1] * box.half_m[1] + sz * box.axisZ[1] * box.half_m[2],
          box.center_m[2] + sx * box.axisX[2] * box.half_m[0] + sy * box.axisY[2] * box.half_m[1] + sz * box.axisZ[2] * box.half_m[2],
        )
        corner.applyMatrix4(inverse)
        bounds.expandByPoint(corner)
      }
    }
  }
  return bounds
}
