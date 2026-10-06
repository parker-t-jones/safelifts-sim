/**
 * The same yaw/pitch/roll as frames.ts, packed into a three.js matrix
 * so the gizmo and the drawn module use the tested rotation order.
 * Euler 'YZX' stores roll on X, yaw on Y, and pitch on Z.
 */
import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { degreesToRadians, radiansToDegrees } from '../units/convert'

export function mountMatrix(
  position_m: readonly [number, number, number],
  yawPitchRoll_deg: readonly [number, number, number],
): Matrix4 {
  const [yawDeg, pitchDeg, rollDeg] = yawPitchRoll_deg
  const euler = new Euler(
    degreesToRadians(rollDeg),
    degreesToRadians(yawDeg),
    degreesToRadians(pitchDeg),
    'YZX',
  )
  return new Matrix4().makeRotationFromEuler(euler).setPosition(position_m[0], position_m[1], position_m[2])
}

/** Split a gizmo matrix back into the position and yaw/pitch/roll we store. */
export function poseFromMatrix(matrix: Matrix4): {
  position_m: [number, number, number]
  yawPitchRoll_deg: [number, number, number]
} {
  const position = new Vector3()
  const quaternion = new Quaternion()
  const scale = new Vector3()
  matrix.decompose(position, quaternion, scale)
  const euler = new Euler().setFromQuaternion(quaternion, 'YZX')
  return {
    position_m: [position.x, position.y, position.z],
    yawPitchRoll_deg: [
      radiansToDegrees(euler.y),
      radiansToDegrees(euler.z),
      radiansToDegrees(euler.x),
    ],
  }
}
