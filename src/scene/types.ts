/**
 * Site data. These objects are plain JSON, matching SPEC section 4.5.
 * An imported mesh's triangles live beside the record, not inside it,
 * so a scene can still be saved later without embedding a file.
 */

export type ObstacleType =
  | 'wall'
  | 'column'
  | 'beam'
  | 'duct'
  | 'pipe'
  | 'conduit'
  | 'cableTray'
  | 'sprinklerPipe'
  | 'doorFrame'
  | 'pallet'
  | 'cart'
  | 'person'
  | 'scaffold'
  | 'stud'
  | 'importedMesh'

export type ObstacleMaterial =
  | 'drywall'
  | 'concrete'
  | 'steel'
  | 'wood'
  | 'plastic'
  | 'fabric'
  | 'glass'
  | 'other'

export type ScenePhase = 'structure' | 'mepRoughIn' | 'framingDrywall' | 'finishes' | 'custom'

export interface Obstacle {
  id: string
  type: ObstacleType
  position_m: [number, number, number]
  yawPitchRoll_deg: [number, number, number]
  /** Type-specific sizes. Keys are named in defaults.ts, for example length_m or diameter_m. */
  dimensions_m: Record<string, number>
  /** 0 to 1. ToF range uses this later. Collision does not. */
  reflectivity: number
  material: ObstacleMaterial
  label?: string
}

export interface SiteScene {
  id: string
  name: string
  phase: ScenePhase
  floorSize_m: [number, number]
  ceilingHeight_m: number | null
  seed: number
  obstacles: Obstacle[]
}

export interface CollisionEvent {
  id: string
  obstacleId: string
  label: string
  message: string
}
