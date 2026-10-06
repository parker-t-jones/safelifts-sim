/**
 * Modules placed on the lift. Each one references a template by id.
 * The pose is the whole housing. Sensor poses stay on the template.
 */
import { create } from 'zustand'
import type { SnapPoint } from '../lift/snapPoints'
import { newModuleId } from '../modules/preset'
import type { AttachTarget, ModulePlacement } from '../placement/types'
import { useLiftStore } from './liftStore'

interface PlacementState {
  placements: ModulePlacement[]
  selectedId: string | null
  showFrustums: boolean
  showZoneRays: boolean
  /** True while the move/rotate gizmo is held, so the orbit camera stays still. */
  gizmoDragging: boolean
  select: (id: string | null) => void
  addPlacement: (moduleId: string, snap: SnapPoint | null) => void
  updatePlacement: (id: string, patch: Partial<ModulePlacement>) => void
  snapPlacement: (id: string, snap: SnapPoint) => void
  remove: (id: string) => void
  removeForModule: (moduleId: string) => void
  setShowFrustums: (showFrustums: boolean) => void
  setShowZoneRays: (showZoneRays: boolean) => void
  setGizmoDragging: (gizmoDragging: boolean) => void
}

export const usePlacementStore = create<PlacementState>((set, get) => ({
  placements: [],
  selectedId: null,
  showFrustums: true,
  showZoneRays: false,
  gizmoDragging: false,

  select: (selectedId) => set({ selectedId }),

  addPlacement: (moduleId, snap) => {
    const spec = useLiftStore.getState().spec
    const placement: ModulePlacement = {
      id: newModuleId('placement'),
      moduleId,
      attachTo: snap ? attachFor(snap) : 'chassis',
      position_m: snap ? [...snap.position_m] : [spec.chassisLength_m / 2, spec.chassisHeight_m, 0],
      yawPitchRoll_deg: [0, 0, 0],
      enabled: true,
      mirrored: false,
      snapPointId: snap?.id ?? null,
    }
    set({ placements: [...get().placements, placement], selectedId: placement.id })
  },

  updatePlacement: (id, patch) => {
    set({
      placements: get().placements.map((placement) =>
        placement.id === id ? { ...placement, ...patch } : placement,
      ),
    })
  },

  snapPlacement: (id, snap) => {
    get().updatePlacement(id, {
      attachTo: attachFor(snap),
      position_m: [...snap.position_m],
      snapPointId: snap.id,
    })
  },

  remove: (id) => {
    const placements = get().placements.filter((placement) => placement.id !== id)
    const selectedId = get().selectedId === id ? (placements[0]?.id ?? null) : get().selectedId
    set({ placements, selectedId })
  },

  removeForModule: (moduleId) => {
    const placements = get().placements.filter((placement) => placement.moduleId !== moduleId)
    const selectedStillThere = placements.some((placement) => placement.id === get().selectedId)
    set({ placements, selectedId: selectedStillThere ? get().selectedId : (placements[0]?.id ?? null) })
  },

  setShowFrustums: (showFrustums) => set({ showFrustums }),
  setShowZoneRays: (showZoneRays) => set({ showZoneRays }),
  setGizmoDragging: (gizmoDragging) => set({ gizmoDragging }),
}))

function attachFor(snap: SnapPoint): AttachTarget {
  return snap.frame === 'platform' ? 'platform' : 'chassis'
}
