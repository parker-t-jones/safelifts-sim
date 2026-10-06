/**
 * Module templates. Placements point at these by id, so an edit here
 * shows up on every copy of that template already on the lift.
 */
import { create } from 'zustand'
import { cloneModule, MODULE_PRESETS, newModuleId, SINGLE_SENSOR_MODULE, SIX_CLUSTER_MODULE } from '../modules/preset'
import type { ModuleSensor, SensorModule } from '../modules/types'
import { VL53L8CX_SPEC } from '../sensors/preset'

interface ModuleState {
  modules: SensorModule[]
  selectedId: string | null
  select: (id: string | null) => void
  updateModule: (id: string, patch: Partial<SensorModule>) => void
  updateSensor: (moduleId: string, sensorId: string, patch: Partial<ModuleSensor>) => void
  addSensor: (moduleId: string) => void
  removeSensor: (moduleId: string, sensorId: string) => void
  createSixCluster: () => void
  createSingle: () => void
  duplicate: (id: string) => void
  remove: (id: string) => void
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: structuredClone(MODULE_PRESETS),
  selectedId: SIX_CLUSTER_MODULE.id,

  select: (selectedId) => set({ selectedId }),

  updateModule: (id, patch) => {
    set({
      modules: get().modules.map((module) => (module.id === id ? { ...module, ...patch } : module)),
    })
  },

  updateSensor: (moduleId, sensorId, patch) => {
    const module = get().modules.find((item) => item.id === moduleId)
    if (!module) {
      return
    }
    get().updateModule(moduleId, {
      sensors: module.sensors.map((sensor) => (sensor.id === sensorId ? { ...sensor, ...patch } : sensor)),
    })
  },

  addSensor: (moduleId) => {
    const module = get().modules.find((item) => item.id === moduleId)
    if (!module) {
      return
    }
    const added: ModuleSensor = {
      id: newModuleId('mod-sensor'),
      name: 'New sensor',
      sensorSpecId: VL53L8CX_SPEC.id,
      position_m: [0.02, 0, 0],
      yawPitchRoll_deg: [0, 0, 0],
    }
    get().updateModule(moduleId, { sensors: [...module.sensors, added] })
  },

  removeSensor: (moduleId, sensorId) => {
    const module = get().modules.find((item) => item.id === moduleId)
    if (!module) {
      return
    }
    get().updateModule(moduleId, {
      sensors: module.sensors.filter((sensor) => sensor.id !== sensorId),
    })
  },

  createSixCluster: () => {
    const module = cloneModule(SIX_CLUSTER_MODULE, '6× VL53L8CX cluster')
    set({ modules: [...get().modules, module], selectedId: module.id })
  },

  createSingle: () => {
    const module = cloneModule(SINGLE_SENSOR_MODULE, 'Single sensor')
    set({ modules: [...get().modules, module], selectedId: module.id })
  },

  duplicate: (id) => {
    const module = get().modules.find((item) => item.id === id)
    if (!module) {
      return
    }
    const copy = cloneModule(module)
    set({ modules: [...get().modules, copy], selectedId: copy.id })
  },

  remove: (id) => {
    const modules = get().modules.filter((module) => module.id !== id)
    const selectedId = get().selectedId === id ? (modules[0]?.id ?? null) : get().selectedId
    set({ modules, selectedId })
  },
}))
