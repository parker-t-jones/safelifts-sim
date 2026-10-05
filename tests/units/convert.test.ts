/**
 * Round-trip tests for length and angle conversion.
 * Converting away from meters or radians and back should return the same value.
 */
import { describe, expect, it } from 'vitest'
import {
  METERS_PER_FOOT,
  METERS_PER_INCH,
  degreesToRadians,
  feetToMeters,
  inchesToMeters,
  metersToFeet,
  metersToInches,
  radiansToDegrees,
} from '../../src/units/convert'

describe('length conversion', () => {
  it('uses the international foot and inch', () => {
    expect(feetToMeters(1)).toBe(METERS_PER_FOOT)
    expect(inchesToMeters(1)).toBe(METERS_PER_INCH)
    expect(METERS_PER_FOOT).toBe(0.3048)
    expect(METERS_PER_INCH).toBe(0.0254)
  })

  it('round-trips meters through feet', () => {
    for (const length_m of [0, 1, 1.83, 5.8, -2.5]) {
      expect(feetToMeters(metersToFeet(length_m))).toBeCloseTo(length_m, 10)
    }
  })

  it('round-trips meters through inches', () => {
    for (const length_m of [0, 0.0254, 1, 5.8, -0.81]) {
      expect(inchesToMeters(metersToInches(length_m))).toBeCloseTo(length_m, 10)
    }
  })

  it('converts one foot to twelve inches', () => {
    expect(metersToInches(feetToMeters(1))).toBeCloseTo(12, 10)
  })
})

describe('angle conversion', () => {
  it('round-trips degrees through radians', () => {
    for (const angle_deg of [0, 45, 90, 180, -45, 360]) {
      expect(radiansToDegrees(degreesToRadians(angle_deg))).toBeCloseTo(angle_deg, 10)
    }
  })

  it('maps a half turn to π radians', () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10)
    expect(radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 10)
  })
})
