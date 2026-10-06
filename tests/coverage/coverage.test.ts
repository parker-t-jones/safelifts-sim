/**
 * Coverage: shell growth, field of view, regions, and self-occlusion.
 * The field-of-view cases are worked out by hand in the comments.
 */
import { describe, expect, it } from 'vitest'
import { analyzeHeight } from '../../src/coverage/analyze'
import { buildOccluder } from '../../src/coverage/occlusion'
import { locatePoint } from '../../src/coverage/envelope'
import { operatorPose, sensorsSeeingOperator } from '../../src/coverage/operator'
import { effectiveEnvelope_m, warningAtHeight } from '../../src/coverage/shell'
import { buildSolids } from '../../src/coverage/solids'
import { inFieldOfView, inRange, viewFromSensor, type CoverageSensor } from '../../src/coverage/sensors'
import { alignedBox } from '../../src/coverage/boxes'
import { DEFAULT_OPERATOR } from '../../src/coverage/types'
import { APPROXIMATE_LIFT } from '../../src/lift/preset'
import { SIX_CLUSTER_MODULE } from '../../src/modules/preset'
import type { ModulePlacement } from '../../src/placement/types'
import { VL53L8CX_SPEC } from '../../src/sensors/preset'
import type { LiftSpec } from '../../src/lift/types'

const placement: ModulePlacement = {
  id: 'placement-front',
  moduleId: SIX_CLUSTER_MODULE.id,
  attachTo: 'platform',
  position_m: [0.8, 1.1, -0.36],
  yawPitchRoll_deg: [0, 0, 0],
  enabled: true,
  mirrored: false,
  snapPointId: 'guardrail-front-left',
}

describe('effective shell', () => {
  it('grows past 1 m when the stowed warning distance needs the extra quarter meter', () => {
    const warning = warningAtHeight(
      APPROXIMATE_LIFT,
      APPROXIMATE_LIFT.platformHeightMin_m,
      [SIX_CLUSTER_MODULE],
      [placement],
      [VL53L8CX_SPEC],
    )
    // Stowed limit 0.9 m/s, brake 1.5 m/s², reaction 0.5 s.
    // Slowest mode is 8×8 at 15 Hz, two frames, plus 0.02 s latency.
    const delay_s = 2 / 15 + 0.02
    const expected_m = 0.9 * (0.5 + delay_s) + (0.9 * 0.9) / (2 * 1.5)
    expect(warning.warningDistance_m).toBeCloseTo(expected_m, 6)
    expect(expected_m + 0.25).toBeGreaterThan(1)
    expect(effectiveEnvelope_m(1, warning.warningDistance_m)).toBeCloseTo(expected_m + 0.25, 6)
  })

  it('keeps a 1 m shell when the elevated warning distance is short', () => {
    const warning = warningAtHeight(
      APPROXIMATE_LIFT,
      APPROXIMATE_LIFT.platformHeightMax_m,
      [SIX_CLUSTER_MODULE],
      [placement],
      [VL53L8CX_SPEC],
    )
    const delay_s = 2 / 15 + 0.02
    const expected_m = 0.2 * (0.5 + delay_s) + (0.2 * 0.2) / (2 * 0.5)
    expect(warning.warningDistance_m).toBeCloseTo(expected_m, 6)
    expect(effectiveEnvelope_m(1, warning.warningDistance_m)).toBe(1)
  })

  it('uses the stowed speed at the elevated threshold itself', () => {
    const atThreshold = warningAtHeight(
      APPROXIMATE_LIFT,
      APPROXIMATE_LIFT.elevatedThreshold_m,
      [SIX_CLUSTER_MODULE],
      [placement],
      [VL53L8CX_SPEC],
    )
    const stowed = warningAtHeight(
      APPROXIMATE_LIFT,
      APPROXIMATE_LIFT.platformHeightMin_m,
      [SIX_CLUSTER_MODULE],
      [placement],
      [VL53L8CX_SPEC],
    )
    expect(atThreshold.warningDistance_m).toBeCloseTo(stowed.warningDistance_m ?? 0, 6)
  })
})

describe('field of view', () => {
  const sensor: CoverageSensor = {
    placementId: 'p',
    sensorId: 's',
    label: 'Forward',
    ownSolidId: 'module-p',
    origin_m: [0, 0, 0],
    axisX: [1, 0, 0],
    axisY: [0, 1, 0],
    axisZ: [0, 0, 1],
    fovH_deg: 90,
    fovV_deg: 90,
    rangeMin_m: 0,
    rangeMax_m: 5,
  }

  it('includes the 45° boundary and excludes the next point', () => {
    // Straight ahead.
    expect(inFieldOfView(viewFromSensor([2, 0, 0], sensor), sensor)).toBe(true)
    // atan2(1, 1) is exactly 45°, which is half of the 90° field.
    expect(inFieldOfView(viewFromSensor([1, 0, 1], sensor), sensor)).toBe(true)
    // atan2(1.1, 1) is about 47.7°, outside the field.
    expect(inFieldOfView(viewFromSensor([1, 0, 1.1], sensor), sensor)).toBe(false)
    // Behind the sensor.
    expect(inFieldOfView(viewFromSensor([-1, 0, 0], sensor), sensor)).toBe(false)
    // Past max range.
    expect(inRange(viewFromSensor([6, 0, 0], sensor), sensor)).toBe(false)
  })
})

describe('regions and bands', () => {
  const spec = APPROXIMATE_LIFT
  const height = spec.platformHeightMin_m
  const solids = buildSolids({
    spec,
    platformHeight_m: height,
    modules: [],
    placements: [],
    operator: DEFAULT_OPERATOR,
  })
  const query = {
    spec,
    platformHeight_m: height,
    solids,
    envelope_m: 1,
    overhead_m: 1,
    warningDistance_m: 0.4,
  }

  it('splits every region into too late and in time', () => {
    const nose = spec.chassisLength_m / 2
    const floor = locatePoint([nose + 0.3, 0.2, 0], query)
    expect(floor?.region).toBe('floor')
    expect(floor?.band).toBe('tooLate')

    const extensionFront = spec.platformLength_m / 2 + spec.extensionDeckLength_m
    const ahead = locatePoint([extensionFront + 0.8, 1.2, 0], query)
    expect(ahead?.region).toBe('front')
    expect(ahead?.band).toBe('inTime')

    const close = locatePoint([extensionFront + 0.2, 1.2, 0], query)
    expect(close?.region).toBe('front')
    expect(close?.band).toBe('tooLate')

    const side = locatePoint([0, 1.2, spec.chassisWidth_m / 2 + 0.2], query)
    expect(side?.region).toBe('right')
    expect(side?.distance_m).toBeLessThan(0.4)
    expect(side?.band).toBe('tooLate')

    const railTop = height + spec.guardrailHeight_m
    const overhead = locatePoint([0, railTop + 0.5, 0], query)
    expect(overhead?.region).toBe('overhead')
    expect(overhead?.distance_m).toBeCloseTo(0.5, 6)
    expect(overhead?.band).toBe('inTime')
  })
})

describe('self-occlusion', () => {
  it('hits a box in the way and misses when the box is gone', () => {
    const box = alignedBox('wall', 'module', true, true, [1, 0, 0], [0.2, 0.4, 0.4])
    const blocked = buildOccluder([box])
    const clear = buildOccluder([])
    expect(blocked.raycast([0, 0, 0], [2, 0, 0], null)?.kind).toBe('module')
    expect(clear.raycast([0, 0, 0], [2, 0, 0], null)).toBeNull()
    blocked.dispose()
    clear.dispose()
  })

  it('lowers coverage when a housing sits in front of the only sensor', async () => {
    const spec = tinyLift()
    const sensorModule = {
      ...SIX_CLUSTER_MODULE,
      id: 'one',
      sensors: [
        {
          id: 'forward',
          name: 'Forward',
          sensorSpecId: VL53L8CX_SPEC.id,
          position_m: [0.02, 0, 0] as [number, number, number],
          yawPitchRoll_deg: [0, 0, 0] as [number, number, number],
        },
      ],
    }
    const sensorPlacement: ModulePlacement = {
      id: 'sensor',
      moduleId: 'one',
      attachTo: 'chassis',
      position_m: [spec.chassisLength_m / 2 + 0.05, 0.3, 0],
      yawPitchRoll_deg: [0, 0, 0],
      enabled: true,
      mirrored: false,
      snapPointId: null,
    }
    const shared = {
      id: 'stowed' as const,
      spec,
      platformHeight_m: spec.platformHeightMin_m,
      sensorSpecs: [{ ...VL53L8CX_SPEC, fovH_deg: 90, fovV_deg: 90, rangeMin_m: 0, rangeMax_m: 8 }],
      operator: DEFAULT_OPERATOR,
      requestedEnvelope_m: 1,
      overhead_m: 0.5,
      spacing_m: 0.25,
      keepPoints: false,
      blindSpot: true,
    }
    const open = await analyzeHeight({
      ...shared,
      modules: [sensorModule],
      placements: [sensorPlacement],
    })
    const wall = {
      ...sensorModule,
      id: 'wall-module',
      housingSize_m: [0.3, 0.8, 0.8] as [number, number, number],
      sensors: [],
    }
    const wallPlacement: ModulePlacement = {
      ...sensorPlacement,
      id: 'wall',
      moduleId: 'wall-module',
      enabled: false,
      position_m: [spec.chassisLength_m / 2 + 0.4, 0.4, 0],
    }
    const blocked = await analyzeHeight({
      ...shared,
      modules: [sensorModule, wall],
      placements: [sensorPlacement, wallPlacement],
    })
    const openCovered = open.report.inTime.covered + open.report.tooLate.covered
    const blockedCovered = blocked.report.inTime.covered + blocked.report.tooLate.covered
    expect(openCovered).toBeGreaterThan(0)
    expect(blockedCovered).toBeLessThan(openCovered)
    expect(blocked.report.rays.module).toBeGreaterThan(0)
  })
})

describe('operator body', () => {
  it('shifts the standing boxes by the panel offsets', () => {
    const pose = operatorPose(APPROXIMATE_LIFT, { ...DEFAULT_OPERATOR, x_m: 0.25, z_m: -0.1 })
    expect(pose.parts[0]?.center_m[0]).toBeCloseTo(0.25, 6)
    expect(pose.parts[0]?.center_m[2]).toBeCloseTo(-0.1, 6)
    expect(pose.parts).toHaveLength(3)
  })

  it('flags a sensor looking at the person and ignores one looking away', () => {
    const spec = APPROXIMATE_LIFT
    const pose = operatorPose(spec, DEFAULT_OPERATOR)
    const torso = pose.parts.find((part) => part.name === 'torso')
    const y = (torso?.center_m[1] ?? 1) + spec.platformHeightMin_m
    const x = (torso?.center_m[0] ?? 1) - 0.4
    const looking: CoverageSensor = {
      placementId: 'p',
      sensorId: 'look',
      label: 'Look',
      ownSolidId: 'module-p',
      origin_m: [x, y, 0],
      axisX: [1, 0, 0],
      axisY: [0, 1, 0],
      axisZ: [0, 0, 1],
      fovH_deg: 90,
      fovV_deg: 90,
      rangeMin_m: 0,
      rangeMax_m: 5,
    }
    const away: CoverageSensor = { ...looking, sensorId: 'away', label: 'Away', axisX: [-1, 0, 0] }
    const occluder = buildOccluder([])
    const alarms = sensorsSeeingOperator(spec.platformHeightMin_m, [pose], [looking, away], occluder)
    occluder.dispose()
    expect(alarms.map((alarm) => alarm.sensorId)).toEqual(['look'])
  })
})

function tinyLift(): LiftSpec {
  return {
    ...APPROXIMATE_LIFT,
    chassisLength_m: 0.8,
    chassisWidth_m: 0.6,
    chassisHeight_m: 0.3,
    platformLength_m: 0.7,
    platformWidth_m: 0.5,
    extensionDeckLength_m: 0,
    guardrailHeight_m: 0.4,
    platformHeightMin_m: 0.5,
    platformHeightMax_m: 2,
    elevatedThreshold_m: 1,
    driveSpeedStowed_mps: 0.2,
    driveSpeedElevated_mps: 0.2,
    operatorReaction_s: 0,
    brakeDecelStowed_mps2: 2,
    brakeDecelElevated_mps2: 2,
  }
}
