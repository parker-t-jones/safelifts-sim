/**
 * Editable lift spec plus the live pose.
 * The 3D view and the Lift tab both read this store.
 */
import { create } from 'zustand'
import { APPROXIMATE_LIFT, initialPose } from '../lift/preset'
import { clamp, initialCommandMemory, stepCommandMemory, stepLift } from '../lift/kinematics'
import type { CommandMemory, DriveCommand } from '../lift/kinematics'
import type { LiftPose, LiftSpec } from '../lift/types'

interface LiftState {
  spec: LiftSpec
  pose: LiftPose
  showSnapPoints: boolean
  /** Drive command the machine is following while control latency runs. */
  commandMemory: CommandMemory
  updateSpec: (patch: Partial<LiftSpec>) => void
  setPlatformHeight: (platformHeight_m: number) => void
  setShowSnapPoints: (showSnapPoints: boolean) => void
  resetApproximatePreset: () => void
  step: (command: DriveCommand, dt_s: number) => void
  /** Put the pose back after a collision rejects the step. */
  replacePose: (pose: LiftPose) => void
}

export const useLiftStore = create<LiftState>((set, get) => ({
  spec: APPROXIMATE_LIFT,
  pose: initialPose(APPROXIMATE_LIFT),
  showSnapPoints: false,
  commandMemory: initialCommandMemory(),

  updateSpec: (patch) => {
    const spec = { ...get().spec, ...patch }
    set({ spec, pose: clampPoseToSpec(get().pose, spec) })
  },

  setPlatformHeight: (platformHeight_m) => {
    const spec = get().spec
    set({
      pose: {
        ...get().pose,
        platformHeight_m: clamp(platformHeight_m, spec.platformHeightMin_m, spec.platformHeightMax_m),
      },
    })
  },

  setShowSnapPoints: (showSnapPoints) => set({ showSnapPoints }),

  resetApproximatePreset: () =>
    set({
      spec: APPROXIMATE_LIFT,
      pose: initialPose(APPROXIMATE_LIFT),
      commandMemory: initialCommandMemory(),
    }),

  step: (command, dt_s) => {
    const { pose, spec, commandMemory } = get()
    const nextMemory = stepCommandMemory(commandMemory, command, spec.controlLatency_s, dt_s)
    set({
      commandMemory: nextMemory,
      pose: stepLift(pose, spec, nextMemory.applied, dt_s),
    })
  },

  replacePose: (pose) => set({ pose }),
}))

/** Keep height and steer inside the spec after a number edit. */
function clampPoseToSpec(pose: LiftPose, spec: LiftSpec): LiftPose {
  return {
    ...pose,
    platformHeight_m: clamp(pose.platformHeight_m, spec.platformHeightMin_m, spec.platformHeightMax_m),
  }
}
