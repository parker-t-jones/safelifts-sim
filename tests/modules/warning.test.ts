/**
 * A module's warning wait is the slowest sensor in the housing:
 * that sensor's confirm frames times its update period, plus its latency.
 */
import { describe, expect, it } from 'vitest'
import { moduleSensorTimings, slowestTimings } from '../../src/modules/warning'
import type { SensorModule } from '../../src/modules/types'
import type { SensorSpec } from '../../src/sensors/types'
import { sensorDelay_s } from '../../src/sensors/derived'

const fast: SensorSpec = {
  id: 'fast',
  name: 'Fast',
  kind: 'tof-multizone',
  fovH_deg: 45,
  fovV_deg: 45,
  rangeMin_m: 0.02,
  rangeMax_m: 4,
  activeModeId: 'fast-mode',
  modes: [{ id: 'fast-mode', name: '4×4', zonesX: 4, zonesY: 4, updateRate_hz: 60 }],
  processingLatency_s: 0.02,
  framesToConfirm: 2,
  notes: '',
  approximate: true,
}

const slow: SensorSpec = {
  ...fast,
  id: 'slow',
  name: 'Slow',
  activeModeId: 'slow-mode',
  modes: [{ id: 'slow-mode', name: '8×8', zonesX: 8, zonesY: 8, updateRate_hz: 15 }],
}

const module: SensorModule = {
  id: 'box',
  name: 'Box',
  housingSize_m: [0.1, 0.1, 0.1],
  notes: '',
  sensors: [
    {
      id: 'a',
      name: 'Fast sensor',
      sensorSpecId: 'fast',
      position_m: [0, 0, 0],
      yawPitchRoll_deg: [0, 0, 0],
    },
    {
      id: 'b',
      name: 'Slow sensor',
      sensorSpecId: 'slow',
      position_m: [0, 0, 0],
      yawPitchRoll_deg: [0, 0, 0],
    },
  ],
}

describe('slowestTimings', () => {
  it('picks the sensor with the longer confirm delay', () => {
    const timings = moduleSensorTimings(module, [fast, slow])
    const slowest = slowestTimings(timings)
    expect(slowest.map((item) => item.sensorId)).toEqual(['b'])
    expect(slowest[0].delay_s).toBeCloseTo(sensorDelay_s(15, 0.02, 2) ?? 0, 8)
    expect(sensorDelay_s(15, 0.02, 2)).toBeGreaterThan(sensorDelay_s(60, 0.02, 2) ?? 0)
  })

  it('reports every sensor when they tie', () => {
    const tied = {
      ...module,
      sensors: module.sensors.map((sensor) => ({ ...sensor, sensorSpecId: 'slow' })),
    }
    const slowest = slowestTimings(moduleSensorTimings(tied, [slow]))
    expect(slowest).toHaveLength(2)
  })

  it('ignores a sensor whose spec is missing', () => {
    const slowest = slowestTimings(moduleSensorTimings(module, [fast]))
    expect(slowest.map((item) => item.sensorId)).toEqual(['a'])
  })
})
