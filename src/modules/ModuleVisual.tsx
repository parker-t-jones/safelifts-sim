/**
 * Draws a module housing and the sensors fixed inside it.
 * Used by the small preview and by placements on the lift.
 * Sensor colors follow the order in the template so the preview
 * matches the lift.
 */
import { useMemo, type ReactNode } from 'react'
import { Euler } from 'three'
import { SensorFrustum } from '../sensors/SensorFrustum'
import { useSensorStore } from '../state/sensorStore'
import { degreesToRadians } from '../units/convert'
import { mirrorMount } from './frames'
import type { SensorModule } from './types'

/** Preview pyramids are this long so six of them fit in the small view. */
export const PREVIEW_FRUSTUM_M = 0.35

const SENSOR_COLORS = ['#38bdf8', '#fb923c', '#a3e635', '#e879f9', '#facc15', '#fb7185']

export function sensorColor(index: number): string {
  return SENSOR_COLORS[index % SENSOR_COLORS.length]
}

export function ModuleVisual(props: {
  module: SensorModule
  showFrustums: boolean
  showRays: boolean
  /** When set, every pyramid uses this length instead of the sensor max range. */
  previewRange_m?: number
  /** Flip sensors left-to-right. The housing box is centered, so it looks the same. */
  mirrored?: boolean
  namePrefix?: string
}) {
  const specs = useSensorStore((state) => state.specs)
  const { module } = props

  return (
    <group name={props.namePrefix}>
      <mesh>
        <boxGeometry args={module.housingSize_m} />
        <meshStandardMaterial color="#334155" transparent opacity={0.45} />
      </mesh>
      {module.sensors.map((sensor, index) => {
        const spec = specs.find((item) => item.id === sensor.sensorSpecId) ?? null
        const pose = props.mirrored
          ? mirrorMount({ position_m: sensor.position_m, yawPitchRoll_deg: sensor.yawPitchRoll_deg })
          : { position_m: sensor.position_m, yawPitchRoll_deg: sensor.yawPitchRoll_deg }
        return (
          <MountedSensor
            key={sensor.id}
            position_m={pose.position_m}
            yawPitchRoll_deg={pose.yawPitchRoll_deg}
            name={props.namePrefix ? `${props.namePrefix}-${sensor.id}` : sensor.id}
          >
            {spec && props.showFrustums ? (
              <SensorFrustum
                spec={spec}
                color={sensorColor(index)}
                showRays={props.showRays}
                range_m={props.previewRange_m}
                name={props.namePrefix ? `${props.namePrefix}-${sensor.id}` : sensor.id}
              />
            ) : (
              <mesh>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshBasicMaterial color={spec ? sensorColor(index) : '#f87171'} />
              </mesh>
            )}
          </MountedSensor>
        )
      })}
    </group>
  )
}

function MountedSensor(props: {
  position_m: readonly [number, number, number]
  yawPitchRoll_deg: readonly [number, number, number]
  name?: string
  children: ReactNode
}) {
  const [yawDeg, pitchDeg, rollDeg] = props.yawPitchRoll_deg
  const rotation = useMemo(
    () => new Euler(degreesToRadians(rollDeg), degreesToRadians(yawDeg), degreesToRadians(pitchDeg), 'YZX'),
    [yawDeg, pitchDeg, rollDeg],
  )
  return (
    <group name={props.name} position={props.position_m} rotation={rotation}>
      {props.children}
    </group>
  )
}
