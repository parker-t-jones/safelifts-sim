/**
 * Lift versus obstacle overlap. No physics engine: the drive loop keeps
 * the last pose that was clear and sets speed to zero.
 * Touching without penetrating is not a hit, so a 32 in chassis can
 * meet a 32 in opening.
 */
import { dot, normalize, cross } from '../coverage/boxes'
import { buildSolids } from '../coverage/solids'
import { DEFAULT_OPERATOR } from '../coverage/types'
import { forwardXZ, liftPointToWorld, rightXZ } from '../lift/frames'
import type { LiftPose, LiftSpec } from '../lift/types'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import { obstacleBoxes, placeholderCube, type OrientedBox } from './boxes'
import { hasImportedMesh } from './imports'
import type { Obstacle } from './types'
import type { SolidBox } from '../coverage/boxes'

/** Overlap smaller than this is treated as a touch, not a collision. */
const PENETRATION_M = 0.0001

export function boxesOverlap(a: OrientedBox, b: OrientedBox): boolean {
  const axes: Array<[number, number, number]> = [
    a.axisX,
    a.axisY,
    a.axisZ,
    b.axisX,
    b.axisY,
    b.axisZ,
    cross(a.axisX, b.axisX),
    cross(a.axisX, b.axisY),
    cross(a.axisX, b.axisZ),
    cross(a.axisY, b.axisX),
    cross(a.axisY, b.axisY),
    cross(a.axisY, b.axisZ),
    cross(a.axisZ, b.axisX),
    cross(a.axisZ, b.axisY),
    cross(a.axisZ, b.axisZ),
  ]
  for (const axis of axes) {
    if (Math.hypot(axis[0], axis[1], axis[2]) < 1e-8) {
      continue
    }
    if (overlapOn(a, b, axis) <= PENETRATION_M) {
      return false
    }
  }
  return true
}

/** Obstacle ids whose boxes the lift would occupy at this pose. */
export function liftHits(
  pose: LiftPose,
  spec: LiftSpec,
  obstacles: readonly Obstacle[],
  modules: readonly SensorModule[],
  placements: readonly ModulePlacement[],
): string[] {
  const liftBoxes = liftWorldBoxes(pose, spec, modules, placements)
  const hits: string[] = []
  for (const obstacle of obstacles) {
    const boxes =
      obstacle.type === 'importedMesh' && !hasImportedMesh(obstacle.id)
        ? [placeholderCube(obstacle)]
        : obstacleBoxes(obstacle)
    if (boxes.some((box) => liftBoxes.some((liftBox) => boxesOverlap(liftBox, box)))) {
      hits.push(obstacle.id)
    }
  }
  return hits
}

/**
 * Chassis, decks, rails, scissors, and module housings. The basket
 * volume is open air, so it does not stop the lift. The coverage
 * mannequin is not a collision body either.
 */
export function liftWorldBoxes(
  pose: LiftPose,
  spec: LiftSpec,
  modules: readonly SensorModule[],
  placements: readonly ModulePlacement[],
): OrientedBox[] {
  return buildSolids({
    spec,
    platformHeight_m: pose.platformHeight_m,
    modules,
    placements,
    operator: DEFAULT_OPERATOR,
  })
    .filter((solid) => solid.occlude)
    .map((solid) => solidToWorld(solid, pose))
}

function solidToWorld(solid: SolidBox, pose: LiftPose): OrientedBox {
  return {
    center_m: liftPointToWorld(solid.center_m, pose),
    half_m: solid.half_m,
    axisX: yawVector(solid.axisX, pose.yaw_rad),
    axisY: yawVector(solid.axisY, pose.yaw_rad),
    axisZ: yawVector(solid.axisZ, pose.yaw_rad),
  }
}

function yawVector(vector: readonly [number, number, number], yaw_rad: number): [number, number, number] {
  const forward = forwardXZ(yaw_rad)
  const right = rightXZ(yaw_rad)
  return [
    vector[0] * forward.x + vector[2] * right.x,
    vector[1],
    vector[0] * forward.z + vector[2] * right.z,
  ]
}

function overlapOn(a: OrientedBox, b: OrientedBox, axis: [number, number, number]): number {
  const direction = normalize(axis)
  const delta: [number, number, number] = [
    b.center_m[0] - a.center_m[0],
    b.center_m[1] - a.center_m[1],
    b.center_m[2] - a.center_m[2],
  ]
  const distance = Math.abs(dot(delta, direction))
  return projectedHalf(a, direction) + projectedHalf(b, direction) - distance
}

function projectedHalf(box: OrientedBox, axis: [number, number, number]): number {
  return (
    Math.abs(dot(box.axisX, axis)) * box.half_m[0] +
    Math.abs(dot(box.axisY, axis)) * box.half_m[1] +
    Math.abs(dot(box.axisZ, axis)) * box.half_m[2]
  )
}
