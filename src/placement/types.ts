/**
 * One placed module on the lift. The position is the module origin,
 * in the chassis frame or the platform frame. Sensors inside the module
 * are not stored here.
 */
export type AttachTarget = 'chassis' | 'platform'

export interface ModulePlacement {
  id: string
  moduleId: string
  attachTo: AttachTarget
  position_m: [number, number, number]
  yawPitchRoll_deg: [number, number, number]
  enabled: boolean
  /**
   * Which snap point this pose was copied from.
   * Null means the position was typed or dragged after that.
   * Resizing the lift does not move a placement; snap it again to follow.
   */
  snapPointId: string | null
}
