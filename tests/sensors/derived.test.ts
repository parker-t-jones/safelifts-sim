/**
 * Derived sensor numbers: zone size, effective max range, and the
 * update period used by the later warning distance.
 */
import { describe, expect, it } from 'vitest'
import { degreesToRadians } from '../../src/units/convert'
import { VL53L8CX_SPEC } from '../../src/sensors/preset'
import {
  effectiveMax_m,
  sensorDelay_s,
  updatePeriod_s,
  zoneAngle_deg,
  zoneCenterOnPlane,
  zoneFootprint_m,
} from '../../src/sensors/derived'

describe('zoneAngle_deg', () => {
  it('splits a 45 degree field into 8 equal zones', () => {
    expect(zoneAngle_deg(45, 8)).toBeCloseTo(5.625, 8)
  })

  it('is undefined when the zone count is zero', () => {
    expect(zoneAngle_deg(45, 0)).toBeNull()
  })
})

describe('zoneFootprint_m', () => {
  it('is 2 · d · tan(zone angle / 2)', () => {
    const angle_deg = 45
    const expected = 2 * 2 * Math.tan(degreesToRadians(angle_deg) / 2)
    expect(zoneFootprint_m(2, angle_deg)).toBeCloseTo(expected, 8)
  })
})

describe('effectiveMax_m', () => {
  it('scales range with the square root of reflectivity', () => {
    // 0.22 / 0.88 = 0.25, and sqrt(0.25) = 0.5, so 4 m becomes 2 m.
    expect(effectiveMax_m(4, 0.22, 0.88)).toBeCloseTo(2, 8)
  })

  it('caps the range when the surface is brighter than the reference', () => {
    expect(effectiveMax_m(4, 0.99, 0.88)).toBe(4)
  })

  it('rejects a reference reflectivity of zero', () => {
    expect(effectiveMax_m(4, 0.5, 0)).toBeNull()
  })
})

describe('updatePeriod_s', () => {
  it('is one over the rate for the approximate VL53L8CX modes', () => {
    const eight = VL53L8CX_SPEC.modes.find((mode) => mode.name === '8×8')
    const four = VL53L8CX_SPEC.modes.find((mode) => mode.name === '4×4')
    expect(updatePeriod_s(eight?.updateRate_hz ?? 0)).toBeCloseTo(1 / 15, 8)
    expect(updatePeriod_s(four?.updateRate_hz ?? 0)).toBeCloseTo(1 / 60, 8)
  })

  it('is undefined at zero hertz', () => {
    expect(updatePeriod_s(0)).toBeNull()
  })
})

describe('sensorDelay_s', () => {
  it('waits N update periods, then processing latency', () => {
    expect(sensorDelay_s(15, 0.02, 2)).toBeCloseTo(2 / 15 + 0.02, 8)
    expect(sensorDelay_s(60, 0.02, 2)).toBeCloseTo(2 / 60 + 0.02, 8)
  })

  it('is just the latency when no extra frames are required', () => {
    expect(sensorDelay_s(15, 0.02, 0)).toBeCloseTo(0.02, 8)
  })
})

describe('zoneCenterOnPlane', () => {
  it('puts a single zone straight ahead on the max-range plane', () => {
    const center = zoneCenterOnPlane(4, 45, 45, 1, 1, 0, 0)
    expect(center?.[0]).toBeCloseTo(4, 8)
    expect(center?.[1]).toBeCloseTo(0, 8)
    expect(center?.[2]).toBeCloseTo(0, 8)
  })

  it('puts the first of two horizontal zones to the sensor right', () => {
    const center = zoneCenterOnPlane(1, 90, 0, 2, 1, 0, 0)
    expect(center?.[2]).toBeGreaterThan(0)
  })
})
