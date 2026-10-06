/**
 * Draws the lift from LiftSpec. All positions are in the lift frame:
 * +X forward, +Y up, +Z right. The group itself is placed in the world.
 */
import { Quaternion, Vector3 } from 'three'
import { CoverageCloud } from '../coverage/CoverageCloud'
import { OperatorBody } from '../coverage/OperatorBody'
import { DECK_THICKNESS_M, WHEEL_RADIUS_M } from './visual'
import { PlacedModules } from '../modules/PlacedModules'
import { snapPointsFor } from './snapPoints'
import { useLiftStore } from '../state/liftStore'
import type { LiftSpec } from './types'

const UP = new Vector3(0, 1, 0)

export function LiftModel() {
  const spec = useLiftStore((state) => state.spec)
  const pose = useLiftStore((state) => state.pose)
  const showSnapPoints = useLiftStore((state) => state.showSnapPoints)
  const snaps = snapPointsFor(spec)

  return (
    <group position={[pose.x_m, 0, pose.z_m]} rotation={[0, pose.yaw_rad, 0]}>
      <Chassis spec={spec} />
      <Wheels spec={spec} steer_rad={pose.steer_rad} />
      <ScissorStack spec={spec} platformHeight_m={pose.platformHeight_m} />
      {/* Platform frame origin: center of the main platform floor. */}
      <group position={[0, pose.platformHeight_m, 0]}>
        <Platform spec={spec} />
        <OperatorBody />
        <PlacedModules attachTo="platform" />
        {showSnapPoints
          ? snaps
              .filter((point) => point.frame === 'platform')
              .map((point) => <SnapMarker key={point.id} position={point.position_m} />)
          : null}
      </group>
      <PlacedModules attachTo="chassis" />
      <CoverageCloud />
      {showSnapPoints
        ? snaps
            .filter((point) => point.frame === 'lift')
            .map((point) => <SnapMarker key={point.id} position={point.position_m} />)
        : null}
    </group>
  )
}

function Chassis(props: { spec: LiftSpec }) {
  const { chassisLength_m, chassisWidth_m, chassisHeight_m } = props.spec
  return (
    <group>
      <mesh position={[0, chassisHeight_m / 2, 0]}>
        <boxGeometry args={[chassisLength_m, chassisHeight_m, chassisWidth_m]} />
        <meshStandardMaterial color="#b7791f" />
      </mesh>
      {/* Cone points along +Y. Tipped onto +X so the nose of the lift is obvious. */}
      <mesh
        position={[chassisLength_m / 2 + 0.02, chassisHeight_m + 0.02, 0]}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <coneGeometry args={[0.1, 0.28, 4]} />
        <meshStandardMaterial color="#1c1917" />
      </mesh>
    </group>
  )
}

function Wheels(props: { spec: LiftSpec; steer_rad: number }) {
  const { wheelbase_m, trackWidth_m } = props.spec
  const halfBase = wheelbase_m / 2
  const z = Math.abs(trackWidth_m) / 2
  return (
    <group>
      <Wheel x={-halfBase} z={-z} steer_rad={0} />
      <Wheel x={-halfBase} z={z} steer_rad={0} />
      <Wheel x={halfBase} z={-z} steer_rad={props.steer_rad} />
      <Wheel x={halfBase} z={z} steer_rad={props.steer_rad} />
    </group>
  )
}

function Wheel(props: { x: number; z: number; steer_rad: number }) {
  return (
    <group position={[props.x, WHEEL_RADIUS_M, props.z]} rotation={[0, props.steer_rad, 0]}>
      {/* Cylinder axis is Y. Roll it so the axle runs along lift +Z. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[WHEEL_RADIUS_M, WHEEL_RADIUS_M, 0.12, 16]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    </group>
  )
}

/**
 * X-braces between the chassis top and the platform floor.
 * The horizontal span stays fixed, so the braces get steeper as the
 * platform rises. This is a drawing, not a constant-length linkage.
 */
function ScissorStack(props: { spec: LiftSpec; platformHeight_m: number }) {
  const y0 = props.spec.chassisHeight_m
  const rise = Math.max(props.platformHeight_m - y0, 0.05)
  const bays = 3
  const bayRise = rise / bays
  const span = Math.max(props.spec.chassisLength_m * 0.62, 0.4)
  const sideZ = props.spec.chassisWidth_m * 0.42
  const bars: Array<{ key: string; from: [number, number, number]; to: [number, number, number] }> = []

  for (let bay = 0; bay < bays; bay += 1) {
    const yA = y0 + bay * bayRise
    const yB = yA + bayRise
    for (const z of [-sideZ, sideZ]) {
      bars.push({
        key: `${bay}-${z}-a`,
        from: [-span / 2, yA, z],
        to: [span / 2, yB, z],
      })
      bars.push({
        key: `${bay}-${z}-b`,
        from: [span / 2, yA, z],
        to: [-span / 2, yB, z],
      })
    }
  }

  return (
    <group>
      {bars.map((bar) => (
        <Bar key={bar.key} from={bar.from} to={bar.to} />
      ))}
    </group>
  )
}

function Bar(props: { from: [number, number, number]; to: [number, number, number] }) {
  const start = new Vector3(props.from[0], props.from[1], props.from[2])
  const end = new Vector3(props.to[0], props.to[1], props.to[2])
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const direction = end.clone().sub(start)
  const length = Math.max(direction.length(), 0.001)
  const quaternion = new Quaternion().setFromUnitVectors(UP, direction.normalize())
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.045, 0.045, length, 6]} />
      <meshStandardMaterial color="#f8fafc" />
    </mesh>
  )
}

function Platform(props: { spec: LiftSpec }) {
  const { platformLength_m, platformWidth_m, extensionDeckLength_m, guardrailHeight_m } = props.spec
  const deckLength = Math.max(extensionDeckLength_m, 0)
  return (
    <group>
      <mesh position={[0, -DECK_THICKNESS_M / 2, 0]}>
        <boxGeometry args={[platformLength_m, DECK_THICKNESS_M, platformWidth_m]} />
        <meshStandardMaterial color="#eab308" />
      </mesh>
      <Rails
        x0={-platformLength_m / 2}
        x1={platformLength_m / 2}
        z0={-platformWidth_m / 2}
        z1={platformWidth_m / 2}
        height_m={guardrailHeight_m}
        includeRear
      />
      {deckLength > 0 ? (
        <group>
          <mesh position={[platformLength_m / 2 + deckLength / 2, -DECK_THICKNESS_M / 2, 0]}>
            <boxGeometry args={[deckLength, DECK_THICKNESS_M, platformWidth_m]} />
            <meshStandardMaterial color="#facc15" />
          </mesh>
          {/* The deck shares the platform's front rail, so only the outer three sides are drawn. */}
          <Rails
            x0={platformLength_m / 2}
            x1={platformLength_m / 2 + deckLength}
            z0={-platformWidth_m / 2}
            z1={platformWidth_m / 2}
            height_m={guardrailHeight_m}
            includeRear={false}
          />
        </group>
      ) : null}
    </group>
  )
}

function Rails(props: {
  x0: number
  x1: number
  z0: number
  z1: number
  height_m: number
  includeRear: boolean
}) {
  const { x0, x1, z0, z1, height_m, includeRear } = props
  const spanX = x1 - x0
  const spanZ = z1 - z0
  const post = 0.045
  const yMid = height_m / 2
  const posts: Array<[number, number]> = [
    [x1, z0],
    [x1, z1],
  ]
  if (includeRear) {
    posts.push([x0, z0], [x0, z1])
  }
  return (
    <group>
      {posts.map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, yMid, z]}>
          <boxGeometry args={[post, height_m, post]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ))}
      <mesh position={[x1, height_m, (z0 + z1) / 2]}>
        <boxGeometry args={[0.03, 0.03, spanZ]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      {includeRear ? (
        <mesh position={[x0, height_m, (z0 + z1) / 2]}>
          <boxGeometry args={[0.03, 0.03, spanZ]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      ) : null}
      <mesh position={[(x0 + x1) / 2, height_m, z0]}>
        <boxGeometry args={[spanX, 0.03, 0.03]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <mesh position={[(x0 + x1) / 2, height_m, z1]}>
        <boxGeometry args={[spanX, 0.03, 0.03]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
    </group>
  )
}

function SnapMarker(props: { position: [number, number, number] }) {
  return (
    <mesh position={props.position}>
      <sphereGeometry args={[0.06, 12, 12]} />
      <meshBasicMaterial color="#38bdf8" />
    </mesh>
  )
}
