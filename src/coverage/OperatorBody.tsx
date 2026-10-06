/**
 * The operator pose selected on the Coverage tab.
 * The same boxes block coverage rays.
 */
import { operatorPose } from './operator'
import { useCoverageStore } from '../state/coverageStore'
import { useLiftStore } from '../state/liftStore'

export function OperatorBody() {
  const spec = useLiftStore((state) => state.spec)
  const operator = useCoverageStore((state) => state.operator)
  if (!operator.enabled) {
    return null
  }
  const pose = operatorPose(spec, operator)
  return (
    <group>
      {pose.parts.map((part) => (
        <mesh key={part.name} position={part.center_m}>
          <boxGeometry args={part.size_m} />
          <meshStandardMaterial color="#7dd3fc" />
        </mesh>
      ))}
    </group>
  )
}
