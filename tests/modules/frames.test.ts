/**
 * Mount math: yaw, then pitch, then roll, and the chain from a sensor
 * out to the world. The three.js matrix must match the hand-written rotation
 * because the gizmo stores angles through that matrix.
 */
import { describe, expect, it } from 'vitest'
import { Euler, Matrix4, Vector3 } from 'three'
import { SIX_CLUSTER_MODULE } from '../../src/modules/preset'
import { mirrorMount, rotateMount, sensorPointToWorld, transformPoint } from '../../src/modules/frames'
import { mountMatrix, poseFromMatrix } from '../../src/modules/mountMatrix'
import { degreesToRadians } from '../../src/units/convert'

describe('rotateMount', () => {
  it('leaves a point alone when every angle is zero', () => {
    expect(rotateMount([1, 2, 3], [0, 0, 0])).toEqual([1, 2, 3])
  })

  it('turns forward toward the left on a positive yaw', () => {
    const [x, y, z] = rotateMount([1, 0, 0], [90, 0, 0])
    expect(x).toBeCloseTo(0, 8)
    expect(y).toBeCloseTo(0, 8)
    expect(z).toBeCloseTo(-1, 8)
  })

  it('tilts forward up on a positive pitch', () => {
    const [x, y, z] = rotateMount([1, 0, 0], [0, 90, 0])
    expect(x).toBeCloseTo(0, 8)
    expect(y).toBeCloseTo(1, 8)
    expect(z).toBeCloseTo(0, 8)
  })

  it('tips forward down on the cluster’s bottom-row pitch', () => {
    const [, y] = rotateMount([1, 0, 0], [0, -45, 0])
    expect(y).toBeLessThan(0)
  })

  it('rolls the sensor’s up toward the right', () => {
    const [x, y, z] = rotateMount([0, 1, 0], [0, 0, 90])
    expect(x).toBeCloseTo(0, 8)
    expect(y).toBeCloseTo(0, 8)
    expect(z).toBeCloseTo(1, 8)
  })

  it('matches three.js Euler YZX', () => {
    const yawPitchRoll: [number, number, number] = [30, -45, 10]
    const euler = new Euler(
      degreesToRadians(10),
      degreesToRadians(30),
      degreesToRadians(-45),
      'YZX',
    )
    const matrix = new Matrix4().makeRotationFromEuler(euler)
    const vector = new Vector3(1, 2, -0.5).applyMatrix4(matrix)
    const ours = rotateMount([1, 2, -0.5], yawPitchRoll)
    expect(ours[0]).toBeCloseTo(vector.x, 8)
    expect(ours[1]).toBeCloseTo(vector.y, 8)
    expect(ours[2]).toBeCloseTo(vector.z, 8)
  })
})

describe('poseFromMatrix', () => {
  it('round-trips a mount pose through the gizmo matrix', () => {
    const position: [number, number, number] = [0.4, 1.2, -0.3]
    const angles: [number, number, number] = [25, -45, 5]
    const pose = poseFromMatrix(mountMatrix(position, angles))
    expect(pose.position_m[0]).toBeCloseTo(position[0], 8)
    expect(pose.position_m[1]).toBeCloseTo(position[1], 8)
    expect(pose.position_m[2]).toBeCloseTo(position[2], 8)
    expect(pose.yawPitchRoll_deg[0]).toBeCloseTo(angles[0], 6)
    expect(pose.yawPitchRoll_deg[1]).toBeCloseTo(angles[1], 6)
    expect(pose.yawPitchRoll_deg[2]).toBeCloseTo(angles[2], 6)
  })
})

describe('sensorPointToWorld', () => {
  it('adds platform height only for a platform mount', () => {
    const shared = {
      pointInSensor_m: [1, 0, 0] as [number, number, number],
      sensor: { position_m: [0, 0, 0] as [number, number, number], yawPitchRoll_deg: [0, 0, 0] as [number, number, number] },
      placement: {
        position_m: [2, 0.5, 0] as [number, number, number],
        yawPitchRoll_deg: [0, 0, 0] as [number, number, number],
        attachTo: 'platform' as const,
      },
      platformHeight_m: 3,
      pose: { x_m: 0, z_m: 0, yaw_rad: 0 },
    }
    expect(sensorPointToWorld(shared)).toEqual([3, 3.5, 0])
    expect(sensorPointToWorld({ ...shared, placement: { ...shared.placement, attachTo: 'chassis' } })).toEqual([
      3, 0.5, 0,
    ])
  })

  it('carries a sensor offset through a yawed module and a yawed lift', () => {
    // The sensor sits 1 m forward in the module. Module yaw +90° swings that
    // onto lift −Z. Lift yaw +90° then swings lift −Z toward world −X.
    const inLift = transformPoint([1, 0, 0], [0, 0, 0], [90, 0, 0])
    expect(inLift[2]).toBeCloseTo(-1, 8)
    const [x, y, z] = sensorPointToWorld({
      pointInSensor_m: [0, 0, 0],
      sensor: { position_m: [1, 0, 0], yawPitchRoll_deg: [0, 0, 0] },
      placement: { position_m: [0, 0, 0], yawPitchRoll_deg: [90, 0, 0], attachTo: 'chassis' },
      platformHeight_m: 2,
      pose: { x_m: 4, z_m: 5, yaw_rad: Math.PI / 2 },
    })
    expect(x).toBeCloseTo(3, 6)
    expect(y).toBeCloseTo(0, 6)
    expect(z).toBeCloseTo(5, 6)
  })
})

describe('6× cluster preset', () => {
  it('has six VL53L8CX sensors with the spec angles', () => {
    expect(SIX_CLUSTER_MODULE.sensors).toHaveLength(6)
    const top = SIX_CLUSTER_MODULE.sensors.filter((sensor) => sensor.name.startsWith('Top'))
    const bottom = SIX_CLUSTER_MODULE.sensors.filter((sensor) => sensor.name.startsWith('Bottom'))
    expect(top.map((sensor) => sensor.yawPitchRoll_deg[1])).toEqual([0, 0, 0])
    expect(bottom.map((sensor) => sensor.yawPitchRoll_deg[1])).toEqual([-45, -45, -45])
    expect(top.map((sensor) => sensor.yawPitchRoll_deg[0])).toEqual([45, 0, -45])
    expect(bottom.map((sensor) => sensor.yawPitchRoll_deg[0])).toEqual([45, 0, -45])
    expect(new Set(SIX_CLUSTER_MODULE.sensors.map((sensor) => sensor.sensorSpecId))).toEqual(
      new Set(['vl53l8cx']),
    )
    const left = SIX_CLUSTER_MODULE.sensors.find((sensor) => sensor.name === 'Top left')
    const right = SIX_CLUSTER_MODULE.sensors.find((sensor) => sensor.name === 'Top right')
    expect(left && left.position_m[2]).toBeLessThan(0)
    expect(right && right.position_m[2]).toBeGreaterThan(0)
  })
})

describe('mirrorMount', () => {
  it('turns the left sensor of the cluster into the right one', () => {
    const left = SIX_CLUSTER_MODULE.sensors.find((sensor) => sensor.name === 'Top left')
    const right = SIX_CLUSTER_MODULE.sensors.find((sensor) => sensor.name === 'Top right')
    if (!left || !right) {
      throw new Error('cluster is missing a side sensor')
    }
    const mirrored = mirrorMount(left)
    expect(mirrored.position_m[0]).toBeCloseTo(right.position_m[0], 8)
    expect(mirrored.position_m[1]).toBeCloseTo(right.position_m[1], 8)
    expect(mirrored.position_m[2]).toBeCloseTo(right.position_m[2], 8)
    expect(mirrored.yawPitchRoll_deg[0]).toBeCloseTo(right.yawPitchRoll_deg[0], 8)
    expect(mirrored.yawPitchRoll_deg[1]).toBe(0)
  })

  it('keeps a downward pitch and flips the roll', () => {
    const mirrored = mirrorMount({
      position_m: [0.02, -0.02, -0.04],
      yawPitchRoll_deg: [45, -45, 10],
    })
    expect(mirrored.yawPitchRoll_deg).toEqual([-45, -45, -10])
    const [x, y, z] = rotateMount([1, 0, 0], mirrored.yawPitchRoll_deg)
    expect(y).toBeLessThan(0)
    expect(z).toBeGreaterThan(0)
    expect(x).toBeGreaterThan(0)
  })

  it('places the mirrored sensor on the other side of the module', () => {
    const plain = sensorPointToWorld({
      pointInSensor_m: [0, 0, 0],
      sensor: { position_m: [0, 0, -0.04], yawPitchRoll_deg: [45, 0, 0] },
      placement: { position_m: [1, 2, 0], yawPitchRoll_deg: [0, 0, 0], attachTo: 'chassis' },
      platformHeight_m: 0,
      pose: { x_m: 0, z_m: 0, yaw_rad: 0 },
    })
    const mirrored = sensorPointToWorld({
      pointInSensor_m: [0, 0, 0],
      sensor: { position_m: [0, 0, -0.04], yawPitchRoll_deg: [45, 0, 0] },
      placement: {
        position_m: [1, 2, 0],
        yawPitchRoll_deg: [0, 0, 0],
        attachTo: 'chassis',
        mirrored: true,
      },
      platformHeight_m: 0,
      pose: { x_m: 0, z_m: 0, yaw_rad: 0 },
    })
    expect(plain[2]).toBeCloseTo(-0.04, 8)
    expect(mirrored[2]).toBeCloseTo(0.04, 8)
    expect(mirrored[0]).toBeCloseTo(plain[0], 8)
    expect(mirrored[1]).toBeCloseTo(plain[1], 8)
  })
})
