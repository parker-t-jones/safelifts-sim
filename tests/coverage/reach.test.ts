/**
 * A mount behind the front surface cannot warn in time just because
 * its reach is longer than the warning distance. The setback counts too.
 */
import { describe, expect, it } from 'vitest'
import { IN_TIME_MOUNT_FLAG, sensorReachReport } from '../../src/coverage/reach'
import { DEFAULT_OPERATOR } from '../../src/coverage/types'
import { APPROXIMATE_LIFT } from '../../src/lift/preset'
import { SINGLE_SENSOR_MODULE, SIX_CLUSTER_MODULE } from '../../src/modules/preset'
import type { ModulePlacement } from '../../src/placement/types'
import { darkestMaterial } from '../../src/sensors/derived'
import { VL53L8CX_SPEC } from '../../src/sensors/preset'
import type { LiftSpec } from '../../src/lift/types'

const frontLeft: ModulePlacement = {
  id: 'placement-front',
  moduleId: SIX_CLUSTER_MODULE.id,
  attachTo: 'platform',
  position_m: [0.8, 1.1, -0.36],
  yawPitchRoll_deg: [0, 0, 0],
  enabled: true,
  mirrored: false,
  snapPointId: 'guardrail-front-left',
}

function singleAt(position_m: [number, number, number], yawDeg: number): ModulePlacement {
  return {
    id: 'placement-single',
    moduleId: SINGLE_SENSOR_MODULE.id,
    attachTo: 'platform',
    position_m,
    yawPitchRoll_deg: [yawDeg, 0, 0],
    enabled: true,
    mirrored: false,
    snapPointId: null,
  }
}

const blackRubber = darkestMaterial()

function reportFor(placements: ModulePlacement[], reflectivity = blackRubber.reflectivity, material = blackRubber.name) {
  return sensorReachReport({
    spec: APPROXIMATE_LIFT,
    platformHeight_m: APPROXIMATE_LIFT.platformHeightMin_m,
    modules: [SIX_CLUSTER_MODULE, SINGLE_SENSOR_MODULE],
    placements,
    sensorSpecs: [VL53L8CX_SPEC],
    targetMaterial: material,
    targetReflectivity: reflectivity,
    ambientLight: 'indoor',
  })
}

describe('sensor reach versus warning distance', () => {
  it('flags the front-left cluster on black rubber because the extension sits ahead of the mount', () => {
    const report = reportFor([frontLeft])
    // Stowed warning is about 0.86 m. Black-rubber reach is about 0.95 m.
    // The extension front is about 0.9 m ahead of this rail mount, so the
    // sensor would need both distances added together.
    expect(report.warning_m).toBeGreaterThan(0.8)
    expect(report.sensors).toHaveLength(6)
    for (const sensor of report.sensors) {
      expect(sensor.face).toBe('front')
      expect(sensor.setback_m).toBeGreaterThan(0.8)
      expect(sensor.reach_m).toBeLessThan(1)
      expect(sensor.needed_m).toBeGreaterThan(sensor.reach_m)
      expect(sensor.flagged).toBe(true)
    }
    expect(IN_TIME_MOUNT_FLAG).toBe('cannot give in-time warning from this mount')
    expect(DEFAULT_OPERATOR.enabled).toBe(false)
  })

  it('does not flag a sensor sitting on the front surface when its reach covers the warning distance', () => {
    // The housing's own front face becomes the surface, so the setback is zero.
    const report = reportFor([singleAt([1.71, 1.1, 0], 0)])
    expect(report.sensors).toHaveLength(1)
    const sensor = report.sensors[0]
    expect(sensor.face).toBe('front')
    expect(sensor.setback_m).toBeLessThan(0.02)
    expect(sensor.reach_m).toBeGreaterThan(report.warning_m ?? 0)
    expect(sensor.flagged).toBe(false)
  })

  it('measures a backward sensor from the rear surface', () => {
    const report = reportFor([singleAt([0, 1.1, 0], 180)])
    expect(report.sensors[0].face).toBe('rear')
    expect(report.sensors[0].setback_m).toBeGreaterThan(0.5)
    expect(report.sensors[0].flagged).toBe(true)
  })

  it('does not apply the mount flag to a sensor aimed sideways', () => {
    const report = reportFor([singleAt([0, 1.1, 0], 90)])
    expect(report.sensors[0].face).toBeNull()
    expect(report.sensors[0].flagged).toBe(false)
  })

  it('flags a forward sensor when braking cannot produce a finite warning distance', () => {
    const spec: LiftSpec = { ...APPROXIMATE_LIFT, brakeDecelStowed_mps2: 0 }
    const report = sensorReachReport({
      spec,
      platformHeight_m: spec.platformHeightMin_m,
      modules: [SINGLE_SENSOR_MODULE],
      placements: [singleAt([1.71, 1.1, 0], 0)],
      sensorSpecs: [VL53L8CX_SPEC],
      targetMaterial: 'White reference',
      targetReflectivity: 0.88,
      ambientLight: 'indoor',
    })
    expect(report.warning_m).toBeNull()
    expect(report.sensors[0].flagged).toBe(true)
    expect(report.sensors[0].needed_m).toBeNull()
  })
})
