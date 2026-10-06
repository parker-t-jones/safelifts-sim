/**
 * Advances the lift once per frame from the keys that are held.
 * If that pose would enter an obstacle, the lift stays put and speed
 * goes to zero. Must live inside the Canvas so it runs with the 3D clock.
 */
import { useFrame } from '@react-three/fiber'
import { readDriveCommand } from '../app/driveKeys'
import { liftHits } from '../scene/collision'
import { importedMeshHits } from '../scene/meshHit'
import { useLiftStore } from '../state/liftStore'
import { useModuleStore } from '../state/moduleStore'
import { usePlacementStore } from '../state/placementStore'
import { useSceneStore } from '../state/sceneStore'

/** Skip a huge step after the tab has been in the background. */
const MAX_DT_S = 0.05

export function DriveLoop() {
  const step = useLiftStore((state) => state.step)
  useFrame((_, dt_s) => {
    const before = useLiftStore.getState().pose
    step(readDriveCommand(), Math.min(dt_s, MAX_DT_S))
    const lift = useLiftStore.getState()
    const obstacles = useSceneStore.getState().scene.obstacles
    const modules = useModuleStore.getState().modules
    const placements = usePlacementStore.getState().placements
    const hits = [
      ...liftHits(lift.pose, lift.spec, obstacles, modules, placements),
      ...importedMeshHits(lift.pose, lift.spec, obstacles, modules, placements),
    ]
    if (hits.length > 0) {
      lift.replacePose({ ...before, speed_mps: 0 })
      useSceneStore.getState().noteContacts(hits)
    } else {
      useSceneStore.getState().noteContacts([])
    }
  })
  return null
}
