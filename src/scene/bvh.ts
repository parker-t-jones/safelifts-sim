/**
 * One BVH for every obstacle triangle.
 * Collision of boxes uses the separating-axis test. This tree is what
 * later sensing will ray cast against. Imported meshes are included.
 */
import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Vector3 } from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { mountMatrix } from '../modules/mountMatrix'
import { obstacleBoxes, placeholderCube } from './boxes'
import { getImportedMesh } from './imports'
import type { OrientedBox } from './boxes'
import type { Obstacle } from './types'

export interface SceneBvh {
  bvh: MeshBVH
  geometry: BufferGeometry
  /** Triangle index to obstacle id. indirect: true keeps this order. */
  faceObstacleId: string[]
  dispose: () => void
}

let current: SceneBvh | null = null

export function getSceneBvh(): SceneBvh | null {
  return current
}

export function replaceSceneBvh(obstacles: readonly Obstacle[]): void {
  current?.dispose()
  current = buildSceneBvh(obstacles)
}

export function buildSceneBvh(obstacles: readonly Obstacle[]): SceneBvh | null {
  const positions: number[] = []
  const faceObstacleId: string[] = []
  for (const obstacle of obstacles) {
    const imported = obstacle.type === 'importedMesh' ? getImportedMesh(obstacle.id) : null
    if (imported) {
      appendGeometry(imported.geometry, obstacle, positions, faceObstacleId)
    } else {
      const boxes = obstacle.type === 'importedMesh' ? [placeholderCube(obstacle)] : obstacleBoxes(obstacle)
      for (const box of boxes) {
        appendBox(box, obstacle.id, positions, faceObstacleId)
      }
    }
  }
  if (positions.length === 0) {
    return null
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  const bvh = new MeshBVH(geometry, { indirect: true })
  return {
    bvh,
    geometry,
    faceObstacleId,
    dispose() {
      geometry.dispose()
    },
  }
}

function appendGeometry(
  geometry: BufferGeometry,
  obstacle: Obstacle,
  positions: number[],
  faceObstacleId: string[],
): void {
  const scale = obstacle.dimensions_m.scale ?? 1
  const matrix = mountMatrix(obstacle.position_m, obstacle.yawPitchRoll_deg)
  matrix.scale(new Vector3(scale, scale, scale))
  const source = geometry.index ? geometry.toNonIndexed() : geometry
  const array = source.getAttribute('position').array
  const vertex = new Vector3()
  for (let index = 0; index + 8 < array.length; index += 9) {
    for (let corner = 0; corner < 3; corner += 1) {
      const offset = index + corner * 3
      vertex.set(array[offset], array[offset + 1], array[offset + 2]).applyMatrix4(matrix)
      positions.push(vertex.x, vertex.y, vertex.z)
    }
    faceObstacleId.push(obstacle.id)
  }
  if (source !== geometry) {
    source.dispose()
  }
}

function appendBox(box: OrientedBox, obstacleId: string, positions: number[], faceObstacleId: string[]): void {
  const geometry = new BoxGeometry(box.half_m[0] * 2, box.half_m[1] * 2, box.half_m[2] * 2)
  const matrix = new Matrix4().makeBasis(
    new Vector3(box.axisX[0], box.axisX[1], box.axisX[2]),
    new Vector3(box.axisY[0], box.axisY[1], box.axisY[2]),
    new Vector3(box.axisZ[0], box.axisZ[1], box.axisZ[2]),
  )
  matrix.setPosition(box.center_m[0], box.center_m[1], box.center_m[2])
  geometry.applyMatrix4(matrix)
  const nonIndexed = geometry.toNonIndexed()
  const array = nonIndexed.getAttribute('position').array
  for (let index = 0; index + 8 < array.length; index += 9) {
    for (let offset = 0; offset < 9; offset += 1) {
      positions.push(array[index + offset])
    }
    faceObstacleId.push(obstacleId)
  }
  nonIndexed.dispose()
  geometry.dispose()
}
