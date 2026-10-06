/**
 * Warning time for a whole module. The module can only confirm an obstacle
 * as fast as its slowest sensor, so the preview uses the longest
 * frames-to-confirm delay in the housing.
 */
import { activeMode, sensorDelay_s } from '../sensors/derived'
import type { SensorSpec } from '../sensors/types'
import type { SensorModule } from './types'

export interface SensorTiming {
  sensorId: string
  sensorName: string
  specName: string
  modeName: string
  /** Null when that sensor's update rate is not positive. */
  delay_s: number | null
}

export function moduleSensorTimings(module: SensorModule, specs: readonly SensorSpec[]): SensorTiming[] {
  return module.sensors.map((sensor) => {
    const spec = specs.find((item) => item.id === sensor.sensorSpecId) ?? null
    const mode = spec ? activeMode(spec) : null
    const delay_s =
      spec && mode ? sensorDelay_s(mode.updateRate_hz, spec.processingLatency_s, spec.framesToConfirm) : null
    return {
      sensorId: sensor.id,
      sensorName: sensor.name,
      specName: spec?.name ?? 'Missing sensor',
      modeName: mode?.name ?? '—',
      delay_s,
    }
  })
}

/** Sensors that share the longest confirm delay. Empty when none have a rate. */
export function slowestTimings(timings: readonly SensorTiming[]): SensorTiming[] {
  let longest_s = -1
  for (const timing of timings) {
    if (timing.delay_s !== null && timing.delay_s > longest_s) {
      longest_s = timing.delay_s
    }
  }
  if (longest_s < 0) {
    return []
  }
  return timings.filter((timing) => timing.delay_s !== null && Math.abs(timing.delay_s - longest_s) < 1e-9)
}
