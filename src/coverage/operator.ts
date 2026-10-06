/**
 * Places a person on the platform and asks which sensors can see them.
 * The body is a stack of boxes shifted by the panel's x and z.
 */
import type { LiftSpec } from '../lift/types'
import type { Occluder } from './occlusion'
import { inFieldOfView, inRange, viewFromSensor, type CoverageSensor } from './sensors'
import type { FalseAlarm, OperatorSpec } from './types'

/**
 * Rough standing proportions. Width stays put when the height changes,
 * so a taller person is not also a wider one.
 */
export function operatorParts(height_m: number): BodyPart[] {
  const height = Math.max(0.4, height_m)
  const legTop = height * 0.48
  const torsoTop = height * 0.82
  return [
    {
      name: 'legs',
      center_m: [0, legTop / 2, 0],
      size_m: [0.22, legTop, 0.28],
    },
    {
      name: 'torso',
      center_m: [0, (legTop + torsoTop) / 2, 0],
      size_m: [0.28, torsoTop - legTop, 0.45],
    },
    {
      name: 'head',
      center_m: [0, (torsoTop + height) / 2, 0],
      size_m: [0.2, height - torsoTop, 0.2],
    },
  ]
}

export interface BodyPart {
  name: string
  /** Platform frame. Y is height above the platform floor. */
  center_m: [number, number, number]
  size_m: [number, number, number]
}

export interface OperatorPose {
  parts: BodyPart[]
}

/** Standing body, shifted by the panel offsets. spec is unused until poses are added. */
export function operatorPose(spec: LiftSpec, operator: OperatorSpec): OperatorPose {
  void spec
  return { parts: translate(operatorParts(operator.height_m), operator.x_m, operator.z_m) }
}

/**
 * Sensors with a clear view of the person. The occluder must be the lift
 * without the person, so the body itself is not what blocks the ray.
 */
export function sensorsSeeingOperator(
  platformHeight_m: number,
  poses: readonly OperatorPose[],
  sensors: readonly CoverageSensor[],
  occluder: Occluder,
): FalseAlarm[] {
  const alarms: FalseAlarm[] = []
  const seen = new Set<string>()
  for (const pose of poses) {
    const points = probePoints(pose, platformHeight_m)
    for (const sensor of sensors) {
      const key = `${sensor.placementId}:${sensor.sensorId}`
      if (seen.has(key)) {
        continue
      }
      if (!seesAnyPoint(sensor, points, occluder)) {
        continue
      }
      seen.add(key)
      alarms.push({
        placementId: sensor.placementId,
        sensorId: sensor.sensorId,
        label: sensor.label,
      })
    }
  }
  return alarms
}

function translate(parts: readonly BodyPart[], x_m: number, z_m: number): BodyPart[] {
  return parts.map((part) => ({
    ...part,
    center_m: [part.center_m[0] + x_m, part.center_m[1], part.center_m[2] + z_m],
  }))
}

/** Center and face centers, pulled slightly inside the box. */
function probePoints(pose: OperatorPose, platformHeight_m: number): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = []
  for (const part of pose.parts) {
    const [cx, cy, cz] = part.center_m
    const y = cy + platformHeight_m
    const ix = Math.max(part.size_m[0] / 2 - 0.01, 0)
    const iy = Math.max(part.size_m[1] / 2 - 0.01, 0)
    const iz = Math.max(part.size_m[2] / 2 - 0.01, 0)
    points.push([cx, y, cz])
    points.push([cx + ix, y, cz], [cx - ix, y, cz])
    points.push([cx, y + iy, cz], [cx, y - iy, cz])
    points.push([cx, y, cz + iz], [cx, y, cz - iz])
  }
  return points
}

function seesAnyPoint(
  sensor: CoverageSensor,
  points: readonly (readonly [number, number, number])[],
  occluder: Occluder,
): boolean {
  for (const point of points) {
    const view = viewFromSensor(point, sensor)
    if (!inFieldOfView(view, sensor) || !inRange(view, sensor)) {
      continue
    }
    // A hit means the lift is in the way. No hit means the ray reaches the body.
    if (occluder.raycast(sensor.origin_m, point, sensor.ownSolidId) === null) {
      return true
    }
  }
  return false
}
