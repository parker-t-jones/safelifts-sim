/**
 * Placed modules, drawn inside the lift group or the platform group.
 * The gizmo moves the whole module. It is shown only while the Placement
 * tab is open, so it does not sit on the model during driving.
 */
import { PivotControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import type { Matrix4 } from 'three'
import { useUiStore } from '../state/uiStore'
import { useModuleStore } from '../state/moduleStore'
import { usePlacementStore } from '../state/placementStore'
import { ModuleVisual } from './ModuleVisual'
import { mountMatrix, poseFromMatrix } from './mountMatrix'
import type { AttachTarget } from '../placement/types'

export function PlacedModules(props: { attachTo: AttachTarget }) {
  const placements = usePlacementStore((state) => state.placements)
  const shown = placements.filter((placement) => placement.attachTo === props.attachTo)

  return (
    <group>
      {shown.map((placement) => (
        <PlacedModule key={placement.id} placementId={placement.id} />
      ))}
    </group>
  )
}

function PlacedModule(props: { placementId: string }) {
  const placement = usePlacementStore((state) => state.placements.find((item) => item.id === props.placementId))
  const module = useModuleStore((state) =>
    placement ? state.modules.find((item) => item.id === placement.moduleId) ?? null : null,
  )
  const selectedId = usePlacementStore((state) => state.selectedId)
  const showFrustums = usePlacementStore((state) => state.showFrustums)
  const showZoneRays = usePlacementStore((state) => state.showZoneRays)
  const updatePlacement = usePlacementStore((state) => state.updatePlacement)
  const setGizmoDragging = usePlacementStore((state) => state.setGizmoDragging)
  const sideTab = useUiStore((state) => state.sideTab)
  const dragged = useRef<Matrix4 | null>(null)

  const position = placement?.position_m
  const angles = placement?.yawPitchRoll_deg
  const matrix = useMemo(() => {
    if (!position || !angles) {
      return null
    }
    return mountMatrix(position, angles)
  }, [position, angles])

  if (!placement || !matrix) {
    return null
  }

  const selected = placement.id === selectedId && sideTab === 'Placement'

  return (
    <PivotControls
      matrix={matrix}
      autoTransform
      disableScaling
      enabled={selected}
      visible={selected}
      fixed
      scale={80}
      depthTest={false}
      onDragStart={() => setGizmoDragging(true)}
      onDrag={(local) => {
        // The control reuses this matrix object, so keep a copy for the release.
        dragged.current = local.clone()
      }}
      onDragEnd={() => {
        setGizmoDragging(false)
        const latest = dragged.current
        dragged.current = null
        if (!latest) {
          return
        }
        const pose = poseFromMatrix(latest)
        updatePlacement(placement.id, { ...pose, snapPointId: null })
      }}
    >
      {module ? (
        <ModuleVisual
          module={module}
          showFrustums={placement.enabled && showFrustums}
          showRays={placement.enabled && showZoneRays}
          mirrored={placement.mirrored}
          namePrefix={placement.id}
        />
      ) : null}
    </PivotControls>
  )
}
