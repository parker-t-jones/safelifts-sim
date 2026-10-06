/**
 * Compares each sensor's effective reach with the warning distance.
 * The warning distance is measured from the lift's front or rear surface,
 * so a mount set back behind that surface has to see farther than the
 * warning distance alone.
 */
import type { LiftSpec } from '../lift/types'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import type { AmbientLight } from '../sensors/derived'
import type { SensorSpec } from '../sensors/types'
import { DEFAULT_OPERATOR } from './types'
import { buildSolids } from './solids'
import { warningAtHeight } from './shell'
import { coverageSensors } from './sensors'
import type { SolidBox } from './boxes'

/** Shown on the Coverage tab when a mount cannot see the in-time band. */
export const IN_TIME_MOUNT_FLAG = 'cannot give in-time warning from this mount'

/**
 * Look direction must point this far along lift +X or −X before the
 * front/rear check applies. A sensor aimed sideways or straight up is
 * listed with its reach and is not flagged.
 */
const DRIVE_AIM = 1e-3

export interface SensorReach {
  placementId: string
  sensorId: string
  label: string
  reach_m: number
  /** Which surface the setback is measured from. Null when the sensor is not aimed along the drive axis. */
  face: 'front' | 'rear' | null
  /** How far the sensor origin sits behind that surface. Zero when it is on the surface or ahead of it. */
  setback_m: number
  /** Warning distance plus setback. Null when braking cannot produce a finite warning distance. */
  needed_m: number | null
  flagged: boolean
}

export interface ReachReport {
  /** Warning distance at this platform height. Null when the brake rate is zero. */
  warning_m: number | null
  /** Lift-frame X of the outermost front surface, including the extension. */
  front_m: number
  /** Lift-frame X of the outermost rear surface. */
  rear_m: number
  sensors: SensorReach[]
}

export function sensorReachReport(args: {
  spec: LiftSpec
  platformHeight_m: number
  modules: readonly SensorModule[]
  placements: readonly ModulePlacement[]
  sensorSpecs: readonly SensorSpec[]
  targetMaterial: string
  targetReflectivity: number
  ambientLight: AmbientLight
}): ReachReport {
  const warning_m = warningAtHeight(
    args.spec,
    args.platformHeight_m,
    args.modules,
    args.placements,
    args.sensorSpecs,
  ).warningDistance_m
  const faces = driveFaces(
    buildSolids({
      spec: args.spec,
      platformHeight_m: args.platformHeight_m,
      modules: args.modules,
      placements: args.placements,
      // The operator is not part of the outline the shell is measured from.
      operator: DEFAULT_OPERATOR,
    }),
  )
  const sensors = coverageSensors({
    platformHeight_m: args.platformHeight_m,
    modules: args.modules,
    placements: args.placements,
    sensorSpecs: args.sensorSpecs,
    targetMaterial: args.targetMaterial,
    targetReflectivity: args.targetReflectivity,
    ambientLight: args.ambientLight,
  }).map((sensor) => rowFor(sensor.origin_m[0], sensor.axisX[0], sensor.rangeMax_m, warning_m, faces, sensor))

  return { warning_m, front_m: faces.front_m, rear_m: faces.rear_m, sensors }
}

function rowFor(
  originX_m: number,
  aimX: number,
  reach_m: number,
  warning_m: number | null,
  faces: DriveFaces,
  sensor: { placementId: string; sensorId: string; label: string },
): SensorReach {
  const face = aimX > DRIVE_AIM ? 'front' : aimX < -DRIVE_AIM ? 'rear' : null
  const setback_m =
    face === 'front'
      ? Math.max(0, faces.front_m - originX_m)
      : face === 'rear'
        ? Math.max(0, originX_m - faces.rear_m)
        : 0
  const needed_m = face !== null && warning_m !== null ? warning_m + setback_m : null
  // Equality still reaches the start of the in-time band. Only a shorter reach is flagged.
  // A null warning means there is no finite in-time distance from this mount.
  const flagged = face !== null && (needed_m === null || reach_m + 1e-6 < needed_m)
  return {
    placementId: sensor.placementId,
    sensorId: sensor.sensorId,
    label: sensor.label,
    reach_m,
    face,
    setback_m,
    needed_m,
    flagged,
  }
}

interface DriveFaces {
  front_m: number
  rear_m: number
}

/**
 * Outermost surface along lift +X. Chassis, decks, basket volumes, and
 * module housings count. Rails do not: the basket face is the outline.
 * The extension deck is included, so a sensor on the main rail can sit
 * well behind the front surface.
 */
function driveFaces(solids: readonly SolidBox[]): DriveFaces {
  let front_m = 0
  let rear_m = 0
  let found = false
  for (const solid of solids) {
    if (!solid.surface) {
      continue
    }
    const reach =
      Math.abs(solid.axisX[0]) * solid.half_m[0] +
      Math.abs(solid.axisY[0]) * solid.half_m[1] +
      Math.abs(solid.axisZ[0]) * solid.half_m[2]
    const max = solid.center_m[0] + reach
    const min = solid.center_m[0] - reach
    if (!found || max > front_m) {
      front_m = max
    }
    if (!found || min < rear_m) {
      rear_m = min
    }
    found = true
  }
  return { front_m, rear_m }
}
