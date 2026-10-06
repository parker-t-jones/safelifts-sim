/**
 * Colored samples in the lift frame. Red is unseen, purple is blocked
 * by the lift or the operator, yellow is one sensor, green is two or more.
 */
import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { useCoverageStore } from '../state/coverageStore'

export function CoverageCloud() {
  const showCloud = useCoverageStore((state) => state.showCloud)
  const cloud = useCoverageStore((state) => state.cloud)
  const geometry = useMemo(() => {
    if (!cloud) {
      return null
    }
    const colors = new Float32Array(cloud.counts.length * 3)
    for (let index = 0; index < cloud.counts.length; index += 1) {
      const [red, green, blue] = pointColor(cloud.status[index] ?? 0, cloud.counts[index] ?? 0)
      colors[index * 3] = red
      colors[index * 3 + 1] = green
      colors[index * 3 + 2] = blue
    }
    const next = new BufferGeometry()
    next.setAttribute('position', new BufferAttribute(cloud.positions, 3))
    next.setAttribute('color', new BufferAttribute(colors, 3))
    return next
  }, [cloud])

  if (!showCloud || !geometry || !cloud) {
    return null
  }

  return (
    <points geometry={geometry}>
      <pointsMaterial color="white" size={5} sizeAttenuation={false} vertexColors />
    </points>
  )
}

function pointColor(status: number, count: number): [number, number, number] {
  if (status === 1) {
    return [0.72, 0.58, 0.96]
  }
  if (count >= 2) {
    return [0.29, 0.87, 0.5]
  }
  if (count === 1) {
    return [0.98, 0.8, 0.08]
  }
  return [0.94, 0.27, 0.27]
}
