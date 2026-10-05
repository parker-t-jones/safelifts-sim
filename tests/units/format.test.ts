/**
 * Tests for on-screen length labels.
 * These lock the wording the units toggle shows in the 3D view.
 */
import { describe, expect, it } from 'vitest'
import { feetToMeters, inchesToMeters } from '../../src/units/convert'
import { formatLength } from '../../src/units/format'

describe('formatLength', () => {
  it('shows meters with two decimal places', () => {
    expect(formatLength(1, 'metric')).toBe('1.00 m')
    expect(formatLength(0.5, 'metric')).toBe('0.50 m')
    expect(formatLength(-1.25, 'metric')).toBe('-1.25 m')
  })

  it('shows feet and inches for the imperial default', () => {
    expect(formatLength(feetToMeters(1), 'imperial')).toBe('1 ft 0 in')
    expect(formatLength(inchesToMeters(1), 'imperial')).toBe('0 ft 1 in')
    expect(formatLength(1, 'imperial')).toBe('3 ft 3.4 in')
  })

  it('carries 12 inches into the next foot', () => {
    expect(formatLength(inchesToMeters(12), 'imperial')).toBe('1 ft 0 in')
  })

  it('drops the sign when rounding lands on zero', () => {
    expect(formatLength(-0.0001, 'imperial')).toBe('0 ft 0 in')
  })

  it('keeps a minus sign for a negative length', () => {
    expect(formatLength(-feetToMeters(2), 'imperial')).toBe('-2 ft 0 in')
  })
})
