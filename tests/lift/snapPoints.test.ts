/**
 * Snap-point names follow the lift frame: front is +X, right is +Z.
 */
import { describe, expect, it } from 'vitest'
import { APPROXIMATE_LIFT } from '../../src/lift/preset'
import { snapPointsFor } from '../../src/lift/snapPoints'

describe('snapPointsFor', () => {
  const points = snapPointsFor(APPROXIMATE_LIFT)

  it('puts the chassis front-left corner at +X, −Z, on top of the chassis', () => {
    const point = find(points, 'chassis-front-left')
    expect(point.frame).toBe('lift')
    expect(point.position_m[0]).toBeCloseTo(APPROXIMATE_LIFT.chassisLength_m / 2, 8)
    expect(point.position_m[1]).toBeCloseTo(APPROXIMATE_LIFT.chassisHeight_m, 8)
    expect(point.position_m[2]).toBeCloseTo(-APPROXIMATE_LIFT.chassisWidth_m / 2, 8)
  })

  it('puts guardrail points in the platform frame, at rail height', () => {
    const point = find(points, 'guardrail-front-right')
    expect(point.frame).toBe('platform')
    expect(point.position_m[0]).toBeGreaterThan(0)
    expect(point.position_m[1]).toBeCloseTo(APPROXIMATE_LIFT.guardrailHeight_m, 8)
    expect(point.position_m[2]).toBeGreaterThan(0)
  })

  it('includes corners and midpoints for the chassis and the guardrail', () => {
    expect(points).toHaveLength(16)
  })
})

function find(points: ReturnType<typeof snapPointsFor>, id: string) {
  const point = points.find((item) => item.id === id)
  if (!point) {
    throw new Error(`missing snap point ${id}`)
  }
  return point
}
