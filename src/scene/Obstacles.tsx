/**
 * Draws the site and keeps a BVH of its triangles.
 * The gizmo is shown only on the Scene tab, same as module placement.
 */
import { PivotControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DoubleSide, Quaternion, Vector3 } from 'three'
import type { Matrix4 as Matrix4Type } from 'three'
import { mountMatrix, poseFromMatrix } from '../modules/mountMatrix'
import { useSceneStore } from '../state/sceneStore'
import { useUiStore } from '../state/uiStore'
import { replaceSceneBvh } from './bvh'
import { obstacleBoxes, placeholderCube, type OrientedBox } from './boxes'
import { bakeScale, MATERIAL_COLOR } from './defaults'
import { getImportedMesh } from './imports'
import type { Obstacle } from './types'

export function SceneView() {
  const floorSize_m = useSceneStore((state) => state.scene.floorSize_m)
  const ceilingHeight_m = useSceneStore((state) => state.scene.ceilingHeight_m)
  const obstacles = useSceneStore((state) => state.scene.obstacles)
  const showObstacles = useSceneStore((state) => state.showObstacles)
  const geometryRevision = useSceneStore((state) => state.geometryRevision)
  const armedType = useSceneStore((state) => state.armedType)
  const sideTab = useUiStore((state) => state.sideTab)
  const placeAt = useSceneStore((state) => state.placeAt)

  return (
    <group>
      <SceneBvhKeeper />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[floorSize_m[0], floorSize_m[1]]} />
        <meshStandardMaterial color="#1c1917" />
      </mesh>
      {ceilingHeight_m !== null ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ceilingHeight_m, 0]}>
          <planeGeometry args={[floorSize_m[0], floorSize_m[1]]} />
          <meshStandardMaterial color="#334155" transparent opacity={0.18} side={DoubleSide} />
        </mesh>
      ) : null}
      {armedType && sideTab === 'Scene' ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.01, 0]}
          onClick={(event) => {
            event.stopPropagation()
            placeAt(armedType, event.point.x, event.point.z)
          }}
        >
          <planeGeometry args={[80, 80]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {showObstacles
        ? obstacles.map((obstacle) => (
            <ObstacleView key={`${obstacle.id}-${geometryRevision}`} obstacleId={obstacle.id} />
          ))
        : null}
    </group>
  )
}

function SceneBvhKeeper() {
  const obstacles = useSceneStore((state) => state.scene.obstacles)
  const geometryRevision = useSceneStore((state) => state.geometryRevision)
  useEffect(() => {
    replaceSceneBvh(obstacles)
  }, [obstacles, geometryRevision])
  return null
}

function ObstacleView(props: { obstacleId: string }) {
  const obstacle = useSceneStore((state) => state.scene.obstacles.find((item) => item.id === props.obstacleId))
  const selectedId = useSceneStore((state) => state.selectedId)
  const select = useSceneStore((state) => state.select)
  const updateObstacle = useSceneStore((state) => state.updateObstacle)
  const setGizmoDragging = useSceneStore((state) => state.setGizmoDragging)
  const sideTab = useUiStore((state) => state.sideTab)
  const dragged = useRef<Matrix4Type | null>(null)
  const hot = useFlashing(props.obstacleId)

  const position = obstacle?.position_m
  const angles = obstacle?.yawPitchRoll_deg
  const matrix = useMemo(() => {
    if (!position || !angles) {
      return null
    }
    return mountMatrix(position, angles)
  }, [position, angles])

  if (!obstacle || !matrix) {
    return null
  }

  const selected = obstacle.id === selectedId && sideTab === 'Scene'

  return (
    <PivotControls
      matrix={matrix}
      autoTransform
      disableScaling={false}
      enabled={selected}
      visible={selected}
      fixed
      scale={80}
      depthTest={false}
      onDragStart={() => setGizmoDragging(true)}
      onDrag={(local) => {
        dragged.current = local.clone()
      }}
      onDragEnd={() => {
        setGizmoDragging(false)
        const latest = dragged.current
        dragged.current = null
        if (!latest || !obstacle) {
          return
        }
        const pose = poseFromMatrix(latest)
        const scale = new Vector3()
        latest.decompose(new Vector3(), new Quaternion(), scale)
        updateObstacle(obstacle.id, {
          ...pose,
          dimensions_m: bakeScale(obstacle.type, obstacle.dimensions_m, [scale.x, scale.y, scale.z]),
        })
      }}
    >
      <ObstacleShape
        obstacle={obstacle}
        hot={hot}
        onSelect={(event) => {
          event.stopPropagation()
          select(obstacle.id)
        }}
      />
    </PivotControls>
  )
}

function ObstacleShape(props: {
  obstacle: Obstacle
  hot: boolean
  onSelect: (event: { stopPropagation: () => void }) => void
}) {
  const imported = props.obstacle.type === 'importedMesh' ? getImportedMesh(props.obstacle.id) : null
  // Dark reflectivity is drawn darker so a black pipe does not look like bright steel.
  const color = props.hot
    ? '#f87171'
    : props.obstacle.reflectivity <= 0.08
      ? '#1e293b'
      : MATERIAL_COLOR[props.obstacle.material]
  if (imported) {
    const scale = props.obstacle.dimensions_m.scale ?? 1
    return (
      <mesh geometry={imported.geometry} scale={scale} onClick={props.onSelect}>
        <meshStandardMaterial color={color} />
      </mesh>
    )
  }
  const boxes = localBoxes(props.obstacle)
  return (
    <group>
      {boxes.map((box, index) => (
        <mesh
          key={`${box.center_m.join(',')}-${index}`}
          position={box.center_m}
          onClick={props.onSelect}
        >
          <boxGeometry args={[box.half_m[0] * 2, box.half_m[1] * 2, box.half_m[2] * 2]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  )
}

function localBoxes(obstacle: Obstacle): OrientedBox[] {
  const bare: Obstacle = { ...obstacle, position_m: [0, 0, 0], yawPitchRoll_deg: [0, 0, 0] }
  if (obstacle.type === 'importedMesh') {
    return [placeholderCube(bare)]
  }
  return obstacleBoxes(bare)
}

function useFlashing(id: string): boolean {
  const [hot, setHot] = useState(false)
  useFrame(() => {
    const until = useSceneStore.getState().flashUntil[id] ?? 0
    const next = Date.now() < until
    setHot((current) => (current === next ? current : next))
  })
  return hot
}
