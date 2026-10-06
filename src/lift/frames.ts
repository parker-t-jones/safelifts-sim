/**
 * Lift-frame directions in the world.
 *
 * The lift origin sits on the floor at the center of the chassis footprint.
 * Lift +X is forward, +Y is up, +Z is right.
 * Yaw is a right-handed rotation about +Y, which is three.js rotation.y.
 * Positive yaw turns forward (+X) toward world −Z, the lift's left.
 */
import type { LiftPose } from './types'

export interface XZ {
  x: number
  z: number
}

/** Unit vector along lift +X (forward) at this yaw. */
export function forwardXZ(yaw_rad: number): XZ {
  return { x: Math.cos(yaw_rad), z: -Math.sin(yaw_rad) }
}

/** Unit vector along lift +Z (right) at this yaw. */
export function rightXZ(yaw_rad: number): XZ {
  return { x: Math.sin(yaw_rad), z: Math.cos(yaw_rad) }
}

/**
 * Express a point that is already in the lift frame as a world point.
 * The lift origin's world Y is 0, so local Y is the world height.
 */
export function liftPointToWorld(
  point_m: readonly [number, number, number],
  pose: Pick<LiftPose, 'x_m' | 'z_m' | 'yaw_rad'>,
): [number, number, number] {
  const forward = forwardXZ(pose.yaw_rad)
  const right = rightXZ(pose.yaw_rad)
  const [x, y, z] = point_m
  return [
    pose.x_m + x * forward.x + z * right.x,
    y,
    pose.z_m + x * forward.z + z * right.z,
  ]
}
