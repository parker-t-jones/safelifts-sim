/**
 * Camera modes from the spec: orbit, chase, top-down, and operator.
 * Orbit is the default. The other three follow the lift every frame.
 */
import { useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { OrthographicCamera as OrthographicCameraImpl } from 'three'
import { forwardXZ } from '../lift/frames'
import { OPERATOR_EYE_HEIGHT_M } from '../lift/visual'
import { useLiftStore } from '../state/liftStore'
import { usePlacementStore } from '../state/placementStore'
import type { CameraMode } from '../state/uiStore'

const CHASE_BACK_M = 6
const CHASE_UP_M = 3.2
const TOP_DOWN_HEIGHT_M = 40
const TOP_DOWN_ZOOM = 36

export function CameraRig(props: { mode: CameraMode }) {
  if (props.mode === 'top') {
    return (
      <>
        <OrthographicCamera makeDefault near={0.1} far={200} position={[0, TOP_DOWN_HEIGHT_M, 0]} zoom={TOP_DOWN_ZOOM} />
        <TopDownFollow />
      </>
    )
  }

  return (
    <>
      <PerspectiveCamera makeDefault fov={50} near={0.1} far={300} position={[8, 6, 8]} />
      <AimAtLiftOnMount />
      {props.mode === 'orbit' ? <OrbitFollow /> : null}
      {props.mode === 'chase' ? <ChaseFollow /> : null}
      {props.mode === 'operator' ? <OperatorFollow /> : null}
    </>
  )
}

/** Put the orbit camera on the lift the first time this perspective camera exists. */
function AimAtLiftOnMount() {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    const pose = useLiftStore.getState().pose
    camera.position.set(pose.x_m + 8, 6, pose.z_m + 8)
    camera.up.set(0, 1, 0)
    camera.lookAt(pose.x_m, 0, pose.z_m)
  }, [camera])
  return null
}

function OrbitFollow() {
  const x_m = useLiftStore((state) => state.pose.x_m)
  const z_m = useLiftStore((state) => state.pose.z_m)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const gizmoDragging = usePlacementStore((state) => state.gizmoDragging)
  return (
    <OrbitControls
      // Damping would lag behind a moving target and feel like the lift is slipping.
      enableDamping={false}
      enabled={!gizmoDragging}
      maxPolarAngle={Math.PI / 2.05}
      target={[x_m, Math.min(platformHeight_m * 0.35, 2), z_m]}
    />
  )
}

function ChaseFollow() {
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    const pose = useLiftStore.getState().pose
    const forward = forwardXZ(pose.yaw_rad)
    camera.up.set(0, 1, 0)
    camera.position.set(
      pose.x_m - forward.x * CHASE_BACK_M,
      CHASE_UP_M,
      pose.z_m - forward.z * CHASE_BACK_M,
    )
    camera.lookAt(pose.x_m, Math.max(pose.platformHeight_m * 0.35, 0.6), pose.z_m)
  })
  return null
}

function OperatorFollow() {
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    const pose = useLiftStore.getState().pose
    const spec = useLiftStore.getState().spec
    const forward = forwardXZ(pose.yaw_rad)
    // Stand just aft of center so the front rail is in front of the camera.
    const back_m = Math.min(spec.platformLength_m * 0.15, 0.4)
    // Eye is 1.6 m above the platform floor. See OPERATOR_EYE_HEIGHT_M.
    const eyeY = pose.platformHeight_m + OPERATOR_EYE_HEIGHT_M
    camera.up.set(0, 1, 0)
    camera.position.set(pose.x_m - forward.x * back_m, eyeY, pose.z_m - forward.z * back_m)
    camera.lookAt(pose.x_m + forward.x * 6, eyeY - 0.4, pose.z_m + forward.z * 6)
  })
  return null
}

function TopDownFollow() {
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    const pose = useLiftStore.getState().pose
    camera.position.set(pose.x_m, TOP_DOWN_HEIGHT_M, pose.z_m)
    // Screen-up is world +X, so a yaw of 0 points the lift toward the top of the view.
    camera.up.set(1, 0, 0)
    camera.lookAt(pose.x_m, 0, pose.z_m)
    if (camera instanceof OrthographicCameraImpl) {
      camera.zoom = TOP_DOWN_ZOOM
      camera.updateProjectionMatrix()
    }
  })
  return null
}
