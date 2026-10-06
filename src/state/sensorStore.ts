/**
 * The sensor library. Placed modules draw whatever spec they point at.
 * Saving to disk comes later; the objects are plain data so they can be.
 */
import { create } from 'zustand'
import {
  SENSOR_PRESETS,
  blankRadarSpec,
  blankTofSpec,
  newSensorId,
} from '../sensors/preset'
import type { ResolutionMode, SensorSpec } from '../sensors/types'

interface SensorState {
  specs: SensorSpec[]
  selectedId: string | null
  select: (id: string | null) => void
  updateSpec: (id: string, patch: Partial<SensorSpec>) => void
  updateMode: (specId: string, modeId: string, patch: Partial<ResolutionMode>) => void
  setActiveMode: (specId: string, modeId: string) => void
  addMode: (specId: string) => void
  deleteMode: (specId: string, modeId: string) => void
  createTof: () => void
  createRadar: () => void
  duplicate: (id: string) => void
  remove: (id: string) => void
}

export const useSensorStore = create<SensorState>((set, get) => ({
  specs: structuredClone(SENSOR_PRESETS),
  selectedId: null,

  select: (selectedId) => set({ selectedId }),

  updateSpec: (id, patch) => {
    set({
      specs: get().specs.map((spec) => (spec.id === id ? { ...spec, ...patch } : spec)),
    })
  },

  updateMode: (specId, modeId, patch) => {
    set({
      specs: get().specs.map((spec) => {
        if (spec.id !== specId) {
          return spec
        }
        return {
          ...spec,
          modes: spec.modes.map((mode) => (mode.id === modeId ? { ...mode, ...patch } : mode)),
        }
      }),
    })
  },

  setActiveMode: (specId, modeId) => {
    get().updateSpec(specId, { activeModeId: modeId })
  },

  addMode: (specId) => {
    const spec = get().specs.find((item) => item.id === specId)
    if (!spec) {
      return
    }
    const source = spec.modes.find((mode) => mode.id === spec.activeModeId) ?? spec.modes[0]
    const modeId = newSensorId('mode')
    const added: ResolutionMode = source
      ? { ...source, id: modeId, name: 'New mode' }
      : { id: modeId, name: 'New mode', zonesX: 1, zonesY: 1, updateRate_hz: 10 }
    get().updateSpec(specId, {
      modes: [...spec.modes, added],
      activeModeId: modeId,
    })
  },

  deleteMode: (specId, modeId) => {
    const spec = get().specs.find((item) => item.id === specId)
    if (!spec || spec.modes.length <= 1) {
      return
    }
    const modes = spec.modes.filter((mode) => mode.id !== modeId)
    const activeModeId = spec.activeModeId === modeId ? modes[0].id : spec.activeModeId
    get().updateSpec(specId, { modes, activeModeId })
  },

  createTof: () => {
    const spec = blankTofSpec()
    set({ specs: [...get().specs, spec], selectedId: spec.id })
  },

  createRadar: () => {
    const spec = blankRadarSpec()
    set({ specs: [...get().specs, spec], selectedId: spec.id })
  },

  duplicate: (id) => {
    const spec = get().specs.find((item) => item.id === id)
    if (!spec) {
      return
    }
    const copy = cloneSpec(spec)
    set({ specs: [...get().specs, copy], selectedId: copy.id })
  },

  remove: (id) => {
    const specs = get().specs.filter((spec) => spec.id !== id)
    const selectedId = get().selectedId === id ? null : get().selectedId
    set({ specs, selectedId })
  },

}))

function cloneSpec(spec: SensorSpec): SensorSpec {
  const copy = structuredClone(spec)
  copy.id = newSensorId('sensor')
  copy.name = `${spec.name} copy`
  const modeIds = new Map<string, string>()
  copy.modes = copy.modes.map((mode) => {
    const id = newSensorId('mode')
    modeIds.set(mode.id, id)
    return { ...mode, id }
  })
  copy.activeModeId = modeIds.get(spec.activeModeId) ?? copy.modes[0].id
  return copy
}
