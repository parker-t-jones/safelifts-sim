/**
 * Built-in module templates. The 6× cluster is the default.
 * Its angles match the spec (top row level, bottom row pitched down,
 * each row aimed left / ahead / right). The spacing is a placeholder
 * until it is matched to the CAD, and the notes say so.
 */
import { VL53L8CX_SPEC } from '../sensors/preset'
import type { ModuleSensor, SensorModule } from './types'

/** Lateral spacing between sensor origins. Approximate, not from CAD. */
const COLUMN_SPACING_M = 0.04
/** Vertical spacing from the module center to each row. Approximate. */
const ROW_OFFSET_M = 0.02
/** Sensors sit on the front face of the housing. */
const FACE_X_M = 0.025

export const SINGLE_SENSOR_MODULE: SensorModule = {
  id: 'module-single',
  name: 'Single sensor',
  housingSize_m: [0.04, 0.03, 0.03],
  notes: 'One sensor facing forward. The housing size is a placeholder.',
  sensors: [
    sensor({
      id: 'single-forward',
      name: 'Forward',
      yawDeg: 0,
      pitchDeg: 0,
      position_m: [0.02, 0, 0],
    }),
  ],
}

export const SIX_CLUSTER_MODULE: SensorModule = {
  id: 'module-6x',
  name: '6× VL53L8CX cluster',
  // Depth, height, width. Large enough that the six origins sit on the front face.
  housingSize_m: [0.05, 0.08, 0.14],
  notes:
    'Approximate layout. Top row pitch 0°. Bottom row pitch −45°. Left sensor yaws +45° (toward module left), center 0°, right −45°. Move the positions to match the CAD.',
  sensors: [
    namedRow('Top', ROW_OFFSET_M, 0),
    namedRow('Bottom', -ROW_OFFSET_M, -45),
  ].flat(),
}

export const MODULE_PRESETS: SensorModule[] = [SIX_CLUSTER_MODULE, SINGLE_SENSOR_MODULE]

export function newModuleId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${random}`
}

/** A second copy with fresh ids, so two clusters can be edited separately. */
export function cloneModule(module: SensorModule, name?: string): SensorModule {
  const copy = structuredClone(module)
  copy.id = newModuleId('module')
  copy.name = name ?? `${module.name} copy`
  copy.sensors = copy.sensors.map((item) => ({ ...item, id: newModuleId('mod-sensor') }))
  return copy
}

function namedRow(rowName: string, y_m: number, pitchDeg: number): ModuleSensor[] {
  // Left is module −Z. Positive yaw aims that way, so the left sensor yaws +45
  // and the right sensor yaws −45. That fans the views outward.
  const columns: Array<{ name: string; z_m: number; yawDeg: number }> = [
    { name: 'left', z_m: -COLUMN_SPACING_M, yawDeg: 45 },
    { name: 'center', z_m: 0, yawDeg: 0 },
    { name: 'right', z_m: COLUMN_SPACING_M, yawDeg: -45 },
  ]
  return columns.map((column) =>
    sensor({
      id: `cluster-${rowName.toLowerCase()}-${column.name}`,
      name: `${rowName} ${column.name}`,
      yawDeg: column.yawDeg,
      pitchDeg,
      position_m: [FACE_X_M, y_m, column.z_m],
    }),
  )
}

function sensor(args: {
  id: string
  name: string
  yawDeg: number
  pitchDeg: number
  position_m: [number, number, number]
}): ModuleSensor {
  return {
    id: args.id,
    name: args.name,
    sensorSpecId: VL53L8CX_SPEC.id,
    position_m: args.position_m,
    yawPitchRoll_deg: [args.yawDeg, args.pitchDeg, 0],
  }
}
