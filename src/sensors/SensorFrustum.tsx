/**
 * One sensor's view, drawn in the sensor frame: a translucent pyramid
 * and, optionally, a line through the center of each zone.
 */
import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { activeMode } from './derived'
import { pyramidPositions, zoneRayPositions } from './frustumGeometry'
import type { SensorSpec } from './types'

export function SensorFrustum(props: {
  spec: SensorSpec
  color: string
  showRays: boolean
  /** Shortens the drawing in the module preview. Omit to use max range. */
  range_m?: number
  name?: string
}) {
  const range_m = props.range_m ?? props.spec.rangeMax_m
  const mode = activeMode(props.spec)
  const positions = useMemo(
    () => pyramidPositions(range_m, props.spec.fovH_deg, props.spec.fovV_deg),
    [range_m, props.spec.fovH_deg, props.spec.fovV_deg],
  )
  const rayPositions = useMemo(() => {
    if (!props.showRays || !mode || props.spec.kind === 'radar') {
      return null
    }
    return zoneRayPositions(range_m, props.spec.fovH_deg, props.spec.fovV_deg, mode.zonesX, mode.zonesY)
  }, [props.showRays, props.spec.kind, props.spec.fovH_deg, props.spec.fovV_deg, range_m, mode])

  return (
    <group name={props.name}>
      <mesh>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshBasicMaterial color={props.color} />
      </mesh>
      {positions && (
        <mesh name={props.name ? `${props.name}-pyramid` : undefined}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          </bufferGeometry>
          <meshBasicMaterial color={props.color} transparent opacity={0.28} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
      {rayPositions && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[rayPositions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={props.color} />
        </lineSegments>
      )}
    </group>
  )
}
