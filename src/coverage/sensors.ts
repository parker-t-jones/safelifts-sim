/**
 * Enabled sensors expressed in the lift frame at one platform height.
 * Coverage ignores where the lift is parked. Yaw of the whole machine
 * does not change which way a sensor points relative to the chassis.
 */
import { mirrorMount, rotateMount, transformPoint } from '../modules/frames'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import { activeMode, tofSeeingRange_m, type AmbientLight } from '../sensors/derived'
import type { SensorSpec } from '../sensors/types'

export interface CoverageSensor {
  placementId: string
  sensorId: string
  label: string
  /** Housing to ignore for the first few centimeters of this sensor's rays. */
  ownSolidId: string
  origin_m: [number, number, number]
  axisX: [number, number, number]
  axisY: [number, number, number]
  axisZ: [number, number, number]
  fovH_deg: number
  fovV_deg: number
  rangeMin_m: number
  rangeMax_m: number
}

export function coverageSensors(args: {
  platformHeight_m: number
  modules: readonly SensorModule[]
  placements: readonly ModulePlacement[]
  sensorSpecs: readonly SensorSpec[]
  /** Material name, used to find a measured-range row. */
  targetMaterial: string
  /**
   * ToF max range is effectiveMax at this reflectivity, unless a measured
   * row replaces it. Radar ignores both: its model does not use material.
   */
  targetReflectivity: number
  ambientLight: AmbientLight
}): CoverageSensor[] {
  const sensors: CoverageSensor[] = []
  for (const placement of args.placements) {
    if (!placement.enabled) {
      continue
    }
    const module = args.modules.find((item) => item.id === placement.moduleId)
    if (!module) {
      continue
    }
    for (const sensor of module.sensors) {
      const spec = args.sensorSpecs.find((item) => item.id === sensor.sensorSpecId)
      if (!spec || !activeMode(spec)) {
        continue
      }
      const pose = placement.mirrored
        ? mirrorMount({ position_m: sensor.position_m, yawPitchRoll_deg: sensor.yawPitchRoll_deg })
        : { position_m: sensor.position_m, yawPitchRoll_deg: sensor.yawPitchRoll_deg }
      const inModule = transformPoint([0, 0, 0], pose.position_m, pose.yawPitchRoll_deg)
      const inAttach = transformPoint(inModule, placement.position_m, placement.yawPitchRoll_deg)
      const origin_m: [number, number, number] =
        placement.attachTo === 'platform'
          ? [inAttach[0], inAttach[1] + args.platformHeight_m, inAttach[2]]
          : [inAttach[0], inAttach[1], inAttach[2]]
      const axisX = aim([1, 0, 0], pose.yawPitchRoll_deg, placement.yawPitchRoll_deg)
      const axisY = aim([0, 1, 0], pose.yawPitchRoll_deg, placement.yawPitchRoll_deg)
      const axisZ = aim([0, 0, 1], pose.yawPitchRoll_deg, placement.yawPitchRoll_deg)
      sensors.push({
        placementId: placement.id,
        sensorId: sensor.id,
        label: `${sensor.name} on ${module.name}`,
        ownSolidId: `module-${placement.id}`,
        origin_m,
        axisX,
        axisY,
        axisZ,
        fovH_deg: spec.fovH_deg,
        fovV_deg: spec.fovV_deg,
        rangeMin_m: Math.max(0, spec.rangeMin_m),
        rangeMax_m: tofSeeingRange_m(spec, args.targetMaterial, args.targetReflectivity, args.ambientLight),
      })
    }
  }
  return sensors
}

function aim(
  direction: [number, number, number],
  sensorAngles: readonly [number, number, number],
  placementAngles: readonly [number, number, number],
): [number, number, number] {
  return rotateMount(rotateMount(direction, sensorAngles), placementAngles)
}

export interface SensorView {
  distance_m: number
  /** Along the sensor's forward axis. Negative means the point is behind it. */
  forward_m: number
  up_m: number
  right_m: number
}

/** Express a lift-frame point in the sensor frame. */
export function viewFromSensor(
  point_m: readonly [number, number, number],
  sensor: CoverageSensor,
): SensorView {
  const dx = point_m[0] - sensor.origin_m[0]
  const dy = point_m[1] - sensor.origin_m[1]
  const dz = point_m[2] - sensor.origin_m[2]
  const forward_m = dx * sensor.axisX[0] + dy * sensor.axisX[1] + dz * sensor.axisX[2]
  const up_m = dx * sensor.axisY[0] + dy * sensor.axisY[1] + dz * sensor.axisY[2]
  const right_m = dx * sensor.axisZ[0] + dy * sensor.axisZ[1] + dz * sensor.axisZ[2]
  return { distance_m: Math.hypot(dx, dy, dz), forward_m, up_m, right_m }
}

/**
 * Rectangular pyramid, matching the drawn frustum.
 * The boundary counts as inside. A point behind the sensor does not.
 */
export function inFieldOfView(view: SensorView, sensor: CoverageSensor): boolean {
  if (!(view.forward_m > 0)) {
    return false
  }
  const halfH = (Math.abs(sensor.fovH_deg) * Math.PI) / 180 / 2
  const halfV = (Math.abs(sensor.fovV_deg) * Math.PI) / 180 / 2
  const horizontal = Math.atan2(Math.abs(view.right_m), view.forward_m)
  const vertical = Math.atan2(Math.abs(view.up_m), view.forward_m)
  return horizontal <= halfH + 1e-8 && vertical <= halfV + 1e-8
}

export function inRange(view: SensorView, sensor: CoverageSensor): boolean {
  return view.distance_m >= sensor.rangeMin_m && view.distance_m <= sensor.rangeMax_m
}
