/**
 * Obstacle boxes, door openings, and the rule that a generated scene
 * does not start with the lift already inside something.
 */
import { describe, expect, it } from 'vitest'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import { APPROXIMATE_LIFT, initialPose } from '../../src/lift/preset'
import type { LiftPose } from '../../src/lift/types'
import { obstacleBoxes, type OrientedBox } from '../../src/scene/boxes'
import { boxesOverlap, liftHits } from '../../src/scene/collision'
import { createObstacle } from '../../src/scene/defaults'
import {
  PHASES,
  darkObjects,
  doorGauntlet,
  generatePhase,
  overheadCourse,
  regenerateScene,
  thinObjects,
} from '../../src/scene/generate'
import { buildSceneBvh } from '../../src/scene/bvh'
import { clearImportedMeshes, setImportedMesh } from '../../src/scene/imports'
import { radiansToDegrees, metersToInches } from '../../src/units/convert'

function poseAt(x_m: number, z_m = 0): LiftPose {
  return { ...initialPose(APPROXIMATE_LIFT), x_m, z_m }
}

describe('obstacles', () => {
  it('builds a door as jambs and a header, with an empty opening', () => {
    const door = doorGauntlet().obstacles[0]
    const boxes = obstacleBoxes(door)
    expect(boxes).toHaveLength(3)
    const probe: OrientedBox = {
      center_m: [door.position_m[0], 1, 0],
      half_m: [0.02, 0.02, 0.02],
      axisX: [1, 0, 0],
      axisY: [0, 1, 0],
      axisZ: [0, 0, 1],
    }
    expect(boxes.some((box) => boxesOverlap(probe, box))).toBe(false)
  })

  it('uses the door-gauntlet clear widths 32, 33, 34, 36, and 42 in', () => {
    const inches = doorGauntlet().obstacles.map((door) => Math.round(metersToInches(door.dimensions_m.clearWidth_m)))
    expect(inches).toEqual([32, 33, 34, 36, 42])
  })

  it('lets a 32 in chassis meet a 32 in opening, and stops a chassis shifted into the jamb', () => {
    const door = doorGauntlet().obstacles[0]
    expect(liftHits(poseAt(door.position_m[0], 0), APPROXIMATE_LIFT, [door], [], [])).toEqual([])
    expect(liftHits(poseAt(door.position_m[0], 0.03), APPROXIMATE_LIFT, [door], [], [])).toContain(door.id)
  })

  it('stops the lift when the chassis enters a wall', () => {
    const wall = createObstacle('wall', [2, 1.2, 0], 'wall-ahead')
    wall.yawPitchRoll_deg = [radiansToDegrees(Math.atan2(-1, 0)), 0, 0]
    wall.dimensions_m = { length_m: 4, height_m: 2.4, thickness_m: 0.2 }
    expect(liftHits(poseAt(0), APPROXIMATE_LIFT, [wall], [], [])).toEqual([])
    expect(liftHits(poseAt(1.3), APPROXIMATE_LIFT, [wall], [], [])).toEqual(['wall-ahead'])
  })

  it('rebuilds a phase from the seed and leaves the origin clear', () => {
    expect(generatePhase('structure', 4)).toEqual(generatePhase('structure', 4))
    const first = generatePhase('mepRoughIn', 1).obstacles.map((item) => item.position_m[1])
    const second = generatePhase('mepRoughIn', 2).obstacles.map((item) => item.position_m[1])
    expect(first).not.toEqual(second)
    const pose = initialPose(APPROXIMATE_LIFT)
    for (const phase of PHASES) {
      for (const seed of [1, 7, 40]) {
        const scene = generatePhase(phase, seed)
        expect(liftHits(pose, APPROXIMATE_LIFT, scene.obstacles, [], [])).toEqual([])
      }
    }
    for (const scene of [doorGauntlet(), overheadCourse(), thinObjects(), darkObjects()]) {
      expect(liftHits(pose, APPROXIMATE_LIFT, scene.obstacles, [], [])).toEqual([])
      expect(regenerateScene(scene)).toEqual(scene)
    }
  })

  it('puts every obstacle into the scene BVH', () => {
    const scene = doorGauntlet()
    const bvh = buildSceneBvh(scene.obstacles)
    expect(bvh).not.toBeNull()
    const ids = new Set(bvh?.faceObstacleId)
    expect(ids).toEqual(new Set(scene.obstacles.map((item) => item.id)))
    bvh?.dispose()
  })

  it('includes an imported mesh in the BVH', () => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
    const obstacle = createObstacle('importedMesh', [4, 0.5, 0], 'mesh-1')
    setImportedMesh(obstacle.id, geometry)
    const bvh = buildSceneBvh([obstacle])
    expect(bvh?.faceObstacleId).toEqual(['mesh-1'])
    expect(liftHits(poseAt(0), APPROXIMATE_LIFT, [obstacle], [], [])).toEqual([])
    bvh?.dispose()
    clearImportedMeshes()
  })
})
