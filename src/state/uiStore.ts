/**
 * Shared UI state: display units and whether the side panel is open.
 *
 * A Zustand store lives outside the React tree, so the top bar and the
 * 3D view can read the same unit system without passing props through
 * every component in between.
 */
import { create } from 'zustand'
import type { DisplayUnitSystem } from '../units/types'

export type CameraMode = 'orbit' | 'chase' | 'top' | 'operator'

export const SIDE_TABS = [
  'Lift',
  'Sensors',
  'Modules',
  'Placement',
  'Coverage',
  'Scene',
  'Lasers',
  'Notes',
] as const

export type SideTab = (typeof SIDE_TABS)[number]

interface UiState {
  unitSystem: DisplayUnitSystem
  setUnitSystem: (unitSystem: DisplayUnitSystem) => void
  sidePanelOpen: boolean
  setSidePanelOpen: (sidePanelOpen: boolean) => void
  cameraMode: CameraMode
  setCameraMode: (cameraMode: CameraMode) => void
  sideTab: SideTab
  setSideTab: (sideTab: SideTab) => void
}

export const useUiStore = create<UiState>((set) => ({
  // Spec default: show feet and inches until the user switches.
  unitSystem: 'imperial',
  setUnitSystem: (unitSystem) => set({ unitSystem }),
  sidePanelOpen: true,
  setSidePanelOpen: (sidePanelOpen) => set({ sidePanelOpen }),
  cameraMode: 'orbit',
  setCameraMode: (cameraMode) => set({ cameraMode }),
  sideTab: 'Lift',
  setSideTab: (sideTab) => set({ sideTab }),
}))
