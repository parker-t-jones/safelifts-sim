/**
 * Lift-frame direction tests. Positive yaw turns forward toward world −Z.
 */
import { describe, expect, it } from 'vitest'
import { liftPointToWorld } from '../../src/lift/frames'

describe('liftPointToWorld', () => {
  it('leaves a point straight ahead on world +X when yaw is 0', () => {
    expect(liftPointToWorld([2, 1, 0], { x_m: 0, z_m: 0, yaw_rad: 0 })).toEqual([2, 1, 0])
  })

  it('puts a point straight ahead on world −Z when yaw is 90 degrees', () => {
    const [x, y, z] = liftPointToWorld([2, 0.5, 0], { x_m: 0, z_m: 0, yaw_rad: Math.PI / 2 })
    expect(x).toBeCloseTo(0, 8)
    expect(y).toBeCloseTo(0.5, 8)
    expect(z).toBeCloseTo(-2, 8)
  })

  it('puts lift-right on world +Z when yaw is 0', () => {
    const [x, , z] = liftPointToWorld([0, 0, 3], { x_m: 4, z_m: 5, yaw_rad: 0 })
    expect(x).toBeCloseTo(4, 8)
    expect(z).toBeCloseTo(8, 8)
  })
})
