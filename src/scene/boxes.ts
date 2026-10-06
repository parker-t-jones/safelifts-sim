/**
 * Turns an obstacle record into oriented boxes in the world.
 * Door frames are three boxes (two jambs and a header) so the opening
 * stays empty. A solid slab would block the gauntlet.
 */
import { rotateMount } from '../modules/frames'
import type { Obstacle } from './types'

export interface OrientedBox {
  center_m: [number, number, number]
  half_m: [number, number, number]
  axisX: [number, number, number]
  axisY: [number, number, number]
  axisZ: [number, number, number]
}

export function obstacleBoxes(obstacle: Obstacle): OrientedBox[] {
  switch (obstacle.type) {
    case 'doorFrame':
      return doorFrame(obstacle)
    case 'importedMesh':
      // Triangles live in the import registry. With no file loaded, collision
      // uses a 1 m cube times the scale instead of these boxes.
      return []
    case 'wall':
      return [centered(obstacle, [num(obstacle, 'length_m', 3), num(obstacle, 'height_m', 2.4), num(obstacle, 'thickness_m', 0.15)])]
    case 'column':
      return [centered(obstacle, [num(obstacle, 'width_m', 0.4), num(obstacle, 'height_m', 3), num(obstacle, 'depth_m', 0.4)])]
    case 'beam':
    case 'duct':
    case 'cableTray':
    case 'pallet':
    case 'cart':
    case 'scaffold':
      return [
        centered(obstacle, [
          num(obstacle, 'length_m', 1),
          num(obstacle, 'height_m', 1),
          num(obstacle, 'width_m', 1),
        ]),
      ]
    case 'pipe':
    case 'conduit':
    case 'sprinklerPipe': {
      const diameter = num(obstacle, 'diameter_m', 0.1)
      return [centered(obstacle, [num(obstacle, 'length_m', 1), diameter, diameter])]
    }
    case 'person':
      return [
        centered(obstacle, [
          num(obstacle, 'depth_m', 0.28),
          num(obstacle, 'height_m', 1.75),
          num(obstacle, 'width_m', 0.45),
        ]),
      ]
    case 'stud':
      return [
        centered(obstacle, [
          num(obstacle, 'depth_m', 0.089),
          num(obstacle, 'height_m', 2.44),
          num(obstacle, 'width_m', 0.038),
        ]),
      ]
  }
}

/** Placeholder cube for an imported mesh that has no file in this session. */
export function placeholderCube(obstacle: Obstacle): OrientedBox {
  const scale = Math.max(0.001, num(obstacle, 'scale', 1))
  return centered(obstacle, [scale, scale, scale])
}

function doorFrame(obstacle: Obstacle): OrientedBox[] {
  const width = num(obstacle, 'clearWidth_m', 0.8128)
  const height = num(obstacle, 'clearHeight_m', 2.4384)
  const depth = num(obstacle, 'depth_m', 0.15)
  const jamb = num(obstacle, 'jamb_m', 0.05)
  // Position is the center of the opening on the floor, not the center of a slab.
  return [
    local(obstacle, [0, height / 2, -(width / 2 + jamb / 2)], [depth, height, jamb]),
    local(obstacle, [0, height / 2, width / 2 + jamb / 2], [depth, height, jamb]),
    local(obstacle, [0, height + jamb / 2, 0], [depth, jamb, width + jamb * 2]),
  ]
}

function centered(obstacle: Obstacle, size_m: [number, number, number]): OrientedBox {
  return local(obstacle, [0, 0, 0], size_m)
}

function local(
  obstacle: Obstacle,
  localCenter_m: [number, number, number],
  size_m: [number, number, number],
): OrientedBox {
  const offset = rotateMount(localCenter_m, obstacle.yawPitchRoll_deg)
  return {
    center_m: [
      obstacle.position_m[0] + offset[0],
      obstacle.position_m[1] + offset[1],
      obstacle.position_m[2] + offset[2],
    ],
    half_m: [Math.abs(size_m[0]) / 2, Math.abs(size_m[1]) / 2, Math.abs(size_m[2]) / 2],
    axisX: rotateMount([1, 0, 0], obstacle.yawPitchRoll_deg),
    axisY: rotateMount([0, 1, 0], obstacle.yawPitchRoll_deg),
    axisZ: rotateMount([0, 0, 1], obstacle.yawPitchRoll_deg),
  }
}

function num(obstacle: Obstacle, key: string, fallback: number): number {
  const value = obstacle.dimensions_m[key]
  return value === undefined || !Number.isFinite(value) ? fallback : value
}
