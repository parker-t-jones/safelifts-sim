/**
 * Advances the lift once per frame from the keys that are held.
 * Must live inside the Canvas so it runs with the 3D clock.
 */
import { useFrame } from '@react-three/fiber'
import { readDriveCommand } from '../app/driveKeys'
import { useLiftStore } from '../state/liftStore'

/** Skip a huge step after the tab has been in the background. */
const MAX_DT_S = 0.05

export function DriveLoop() {
  const step = useLiftStore((state) => state.step)
  useFrame((_, dt_s) => {
    step(readDriveCommand(), Math.min(dt_s, MAX_DT_S))
  })
  return null
}
