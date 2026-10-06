/**
 * Places a person on the platform and asks which sensors can see them.
 * Every preset is checked. Only the selected one is drawn and blocks coverage.
 */
import type { LiftSpec } from '../lift/types'
import type { Occluder } from './occlusion'
import { inFieldOfView, inRange, viewFromSensor, type CoverageSensor } from './sensors'
import type { FalseAlarm, OperatorPresetId, OperatorSpec } from './types'

/** How far the chest sticks out past the front rail in the lean preset. */
export const LEAN_PAST_RAIL_M = 0.3

/** Keep the standing body this far inside a rail so it does not start inside the post. */
const CORNER_CLEARANCE_M = 0.02

export const OPERATOR_PRESET_LABELS: Record<OperatorPresetId, string> = {
  controls: 'At controls',
  frontLeft: 'Front-left corner',
  frontRight: 'Front-right corner',
  leanFront: 'Leaning over the front rail',
}

export const OPERATOR_PRESETS: OperatorPresetId[] = ['controls', 'frontLeft', 'frontRight', 'leanFront']

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
  id: OperatorPresetId
  label: string
  parts: BodyPart[]
}

/** The pose selected in the panel. Corners and the lean ignore the controls x/z. */
export function operatorPose(spec: LiftSpec, operator: OperatorSpec): OperatorPose {
  return poseFor(spec, operator, operator.preset)
}

/** All four poses, in panel order. False-alarm checks use every one. */
export function allOperatorPoses(spec: LiftSpec, operator: OperatorSpec): OperatorPose[] {
  return OPERATOR_PRESETS.map((id) => poseFor(spec, operator, id))
}

/**
 * Sensors with a clear view of any preset. The occluder must be the lift
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
      const key = `${pose.id}:${sensor.placementId}:${sensor.sensorId}`
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
        presetId: pose.id,
      })
    }
  }
  return alarms
}

function poseFor(spec: LiftSpec, operator: OperatorSpec, id: OperatorPresetId): OperatorPose {
  const standing = operatorParts(operator.height_m)
  if (id === 'controls') {
    return { id, label: OPERATOR_PRESET_LABELS[id], parts: translate(standing, operator.x_m, operator.z_m) }
  }
  if (id === 'frontLeft' || id === 'frontRight') {
    const place = cornerPlace(spec, standing, id === 'frontLeft' ? -1 : 1)
    return { id, label: OPERATOR_PRESET_LABELS[id], parts: translate(standing, place.x, place.z) }
  }
  return { id, label: OPERATOR_PRESET_LABELS[id], parts: leanParts(spec, standing) }
}

/**
 * Stand in a front corner of the main platform, inside the rails.
 * The extension is not used: that is where someone stands beside a front-rail module.
 */
function cornerPlace(
  spec: LiftSpec,
  parts: readonly BodyPart[],
  sideSign: -1 | 1,
): { x: number; z: number } {
  let halfX = 0
  let halfZ = 0
  for (const part of parts) {
    halfX = Math.max(halfX, part.size_m[0] / 2)
    halfZ = Math.max(halfZ, part.size_m[2] / 2)
  }
  const front = spec.platformLength_m / 2
  const side = spec.platformWidth_m / 2
  return {
    x: Math.max(0, front - halfX - CORNER_CLEARANCE_M),
    z: sideSign * Math.max(0, side - halfZ - CORNER_CLEARANCE_M),
  }
}

/**
 * Feet stay inside the front rail. The chest and head move forward so the
 * chest face is LEAN_PAST_RAIL_M past that rail. Shifting the boxes, rather
 * than rotating them, keeps the same simple body the coverage rays already use.
 * The front rail is the forward-most one, including the extension when it is out.
 */
function leanParts(spec: LiftSpec, standing: readonly BodyPart[]): BodyPart[] {
  const railX = spec.platformLength_m / 2 + Math.max(0, spec.extensionDeckLength_m)
  const legs = standing.find((part) => part.name === 'legs')
  const legHalfX = legs ? legs.size_m[0] / 2 : 0.11
  const feetX = railX - legHalfX - CORNER_CLEARANCE_M
  return standing.map((part) => {
    if (part.name === 'legs') {
      return { ...part, center_m: [feetX, part.center_m[1], 0] }
    }
    const halfX = part.size_m[0] / 2
    return {
      ...part,
      center_m: [railX + LEAN_PAST_RAIL_M - halfX, part.center_m[1], 0],
    }
  })
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
