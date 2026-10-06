/**
 * The site the lift drives through.
 * Obstacle records stay plain data. Imported triangles live in the
 * session registry, not in this store.
 */
import { create } from 'zustand'
import { createObstacle, newObstacleId, restingY_m } from '../scene/defaults'
import {
  clearImportedMeshes,
  deleteImportedMesh,
  duplicateImportedMesh,
  loadObstacleFile,
  setImportedMesh,
} from '../scene/imports'
import { EMPTY_SCENE } from '../scene/generate'
import type { CollisionEvent, Obstacle, ObstacleType, SiteScene } from '../scene/types'

interface SceneState {
  scene: SiteScene
  selectedId: string | null
  /** Palette type that the next floor click will drop. */
  armedType: ObstacleType | null
  showObstacles: boolean
  gizmoDragging: boolean
  events: CollisionEvent[]
  /** Obstacles the lift is currently refused from entering. */
  contactIds: string[]
  /** Wall-clock time in ms. The mesh stays red until then. */
  flashUntil: Record<string, number>
  geometryRevision: number
  importError: string | null
  setArmedType: (armedType: ObstacleType | null) => void
  setShowObstacles: (showObstacles: boolean) => void
  setGizmoDragging: (gizmoDragging: boolean) => void
  select: (selectedId: string | null) => void
  loadScene: (scene: SiteScene) => void
  setSeed: (seed: number) => void
  setFloorSize: (floorSize_m: [number, number]) => void
  setCeiling: (ceilingHeight_m: number | null) => void
  placeAt: (type: ObstacleType, x_m: number, z_m: number) => void
  updateObstacle: (id: string, patch: Partial<Obstacle>) => void
  duplicateObstacle: (id: string) => void
  deleteObstacle: (id: string) => void
  importFile: (file: File, position_m: [number, number, number]) => Promise<void>
  noteContacts: (ids: readonly string[]) => void
  clearEvents: () => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: EMPTY_SCENE,
  selectedId: null,
  armedType: null,
  showObstacles: true,
  gizmoDragging: false,
  events: [],
  contactIds: [],
  flashUntil: {},
  geometryRevision: 0,
  importError: null,

  setArmedType: (armedType) => set({ armedType }),
  setShowObstacles: (showObstacles) => set({ showObstacles }),
  setGizmoDragging: (gizmoDragging) => set({ gizmoDragging }),
  select: (selectedId) => set({ selectedId }),

  loadScene: (scene) => {
    clearImportedMeshes()
    set({
      scene,
      selectedId: null,
      contactIds: [],
      flashUntil: {},
      events: [],
      importError: null,
      geometryRevision: get().geometryRevision + 1,
    })
  },

  setSeed: (seed) => set({ scene: { ...get().scene, seed } }),

  setFloorSize: (floorSize_m) => set({ scene: { ...get().scene, floorSize_m } }),

  setCeiling: (ceilingHeight_m) => set({ scene: { ...get().scene, ceilingHeight_m } }),

  placeAt: (type, x_m, z_m) => {
    const scene = get().scene
    const created = createObstacle(type, [x_m, restingY_m(type, scene.ceilingHeight_m), z_m])
    set({
      scene: { ...scene, obstacles: [...scene.obstacles, created] },
      selectedId: created.id,
      geometryRevision: get().geometryRevision + 1,
    })
  },

  updateObstacle: (id, patch) => {
    const scene = get().scene
    set({
      scene: {
        ...scene,
        obstacles: scene.obstacles.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      },
      geometryRevision: get().geometryRevision + 1,
    })
  },

  duplicateObstacle: (id) => {
    const scene = get().scene
    const source = scene.obstacles.find((item) => item.id === id)
    if (!source) {
      return
    }
    const copy = structuredClone(source)
    copy.id = newObstacleId()
    copy.position_m = [source.position_m[0] + 0.4, source.position_m[1], source.position_m[2]]
    copy.label = source.label ? `${source.label} copy` : undefined
    duplicateImportedMesh(source.id, copy.id)
    set({
      scene: { ...scene, obstacles: [...scene.obstacles, copy] },
      selectedId: copy.id,
      geometryRevision: get().geometryRevision + 1,
    })
  },

  deleteObstacle: (id) => {
    deleteImportedMesh(id)
    const scene = get().scene
    set({
      scene: { ...scene, obstacles: scene.obstacles.filter((item) => item.id !== id) },
      selectedId: get().selectedId === id ? null : get().selectedId,
      geometryRevision: get().geometryRevision + 1,
    })
  },

  importFile: async (file, position_m) => {
    const created = createObstacle('importedMesh', position_m)
    created.label = file.name
    const scene = get().scene
    set({
      scene: { ...scene, obstacles: [...scene.obstacles, created] },
      selectedId: created.id,
      importError: null,
      geometryRevision: get().geometryRevision + 1,
    })
    try {
      const geometry = await loadObstacleFile(file)
      setImportedMesh(created.id, geometry)
      set({ geometryRevision: get().geometryRevision + 1, importError: null })
    } catch (error) {
      set({ importError: error instanceof Error ? error.message : 'Could not import that file.' })
    }
  },

  noteContacts: (ids) => {
    const unique = [...new Set(ids)]
    const previous = get().contactIds
    const same = unique.length === previous.length && unique.every((id) => previous.includes(id))
    // The drive loop calls this every frame. Skip the update when nothing is touching,
    // or the whole panel would re-render for an empty contact list.
    if (same && unique.length === 0) {
      return
    }
    const now = Date.now()
    const flashUntil = { ...get().flashUntil }
    if (same) {
      for (const id of unique) {
        flashUntil[id] = now + 700
      }
      set({ flashUntil })
      return
    }
    const events = [...get().events]
    for (const id of unique) {
      flashUntil[id] = now + 700
      if (!previous.includes(id)) {
        const obstacle = get().scene.obstacles.find((item) => item.id === id)
        const label = obstacle?.label || obstacle?.type || id
        events.push({
          id: `collision-${now}-${id}-${events.length}`,
          obstacleId: id,
          label,
          message: `COLLISION · ${label}`,
        })
      }
    }
    set({ contactIds: unique, flashUntil, events: events.slice(-40) })
  },

  clearEvents: () => set({ events: [] }),
}))
