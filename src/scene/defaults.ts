/**
 * Starting size, material, and reflectivity for each obstacle type.
 * The numbers are ordinary construction sizes, not from a specific drawing.
 * Reflectivity is an assumption until a measured table replaces it.
 */
import type { Obstacle, ObstacleMaterial, ObstacleType } from './types'

export const OBSTACLE_TYPES: ObstacleType[] = [
  'wall',
  'column',
  'beam',
  'duct',
  'pipe',
  'conduit',
  'cableTray',
  'sprinklerPipe',
  'doorFrame',
  'pallet',
  'cart',
  'person',
  'scaffold',
  'stud',
  'importedMesh',
]

export const TYPE_LABELS: Record<ObstacleType, string> = {
  wall: 'Wall',
  column: 'Column',
  beam: 'Beam',
  duct: 'Duct',
  pipe: 'Pipe',
  conduit: 'Conduit',
  cableTray: 'Cable tray',
  sprinklerPipe: 'Sprinkler pipe',
  doorFrame: 'Door frame',
  pallet: 'Pallet',
  cart: 'Cart',
  person: 'Person',
  scaffold: 'Scaffold',
  stud: 'Stud',
  importedMesh: 'Imported mesh',
}

export const MATERIALS: ObstacleMaterial[] = [
  'drywall',
  'concrete',
  'steel',
  'wood',
  'plastic',
  'fabric',
  'glass',
  'other',
]

export const MATERIAL_LABELS: Record<ObstacleMaterial, string> = {
  drywall: 'Drywall',
  concrete: 'Concrete',
  steel: 'Steel',
  wood: 'Wood',
  plastic: 'Plastic',
  fabric: 'Fabric',
  glass: 'Glass',
  other: 'Other',
}

/**
 * Approximate ToF reflectivity. Drywall is bright, raw steel is mid, fabric is dark.
 * Black pipe is not a separate material: set reflectivity to 0.05 and label it.
 */
export const MATERIAL_REFLECTIVITY: Record<ObstacleMaterial, number> = {
  drywall: 0.8,
  concrete: 0.4,
  steel: 0.5,
  wood: 0.3,
  plastic: 0.6,
  fabric: 0.1,
  glass: 0.1,
  other: 0.2,
}

/** Display color only. Sensing uses reflectivity, not this color. */
export const MATERIAL_COLOR: Record<ObstacleMaterial, string> = {
  drywall: '#e7e5e4',
  concrete: '#a8a29e',
  steel: '#94a3b8',
  wood: '#d97706',
  plastic: '#38bdf8',
  fabric: '#a78bfa',
  glass: '#7dd3fc',
  other: '#f472b6',
}

export interface DimensionField {
  key: string
  label: string
}

export const DIMENSION_FIELDS: Record<ObstacleType, DimensionField[]> = {
  wall: [
    { key: 'length_m', label: 'Length' },
    { key: 'height_m', label: 'Height' },
    { key: 'thickness_m', label: 'Thickness' },
  ],
  column: [
    { key: 'width_m', label: 'Width' },
    { key: 'depth_m', label: 'Depth' },
    { key: 'height_m', label: 'Height' },
  ],
  beam: [
    { key: 'length_m', label: 'Length' },
    { key: 'width_m', label: 'Width' },
    { key: 'height_m', label: 'Height' },
  ],
  duct: [
    { key: 'length_m', label: 'Length' },
    { key: 'width_m', label: 'Width' },
    { key: 'height_m', label: 'Height' },
  ],
  pipe: [
    { key: 'length_m', label: 'Length' },
    { key: 'diameter_m', label: 'Diameter' },
  ],
  conduit: [
    { key: 'length_m', label: 'Length' },
    { key: 'diameter_m', label: 'Diameter' },
  ],
  cableTray: [
    { key: 'length_m', label: 'Length' },
    { key: 'width_m', label: 'Width' },
    { key: 'height_m', label: 'Height' },
  ],
  sprinklerPipe: [
    { key: 'length_m', label: 'Length' },
    { key: 'diameter_m', label: 'Diameter' },
  ],
  doorFrame: [
    { key: 'clearWidth_m', label: 'Clear width' },
    { key: 'clearHeight_m', label: 'Clear height' },
    { key: 'depth_m', label: 'Depth' },
    { key: 'jamb_m', label: 'Jamb' },
  ],
  pallet: [
    { key: 'length_m', label: 'Length' },
    { key: 'width_m', label: 'Width' },
    { key: 'height_m', label: 'Height' },
  ],
  cart: [
    { key: 'length_m', label: 'Length' },
    { key: 'width_m', label: 'Width' },
    { key: 'height_m', label: 'Height' },
  ],
  person: [
    { key: 'width_m', label: 'Width' },
    { key: 'depth_m', label: 'Depth' },
    { key: 'height_m', label: 'Height' },
  ],
  scaffold: [
    { key: 'length_m', label: 'Length' },
    { key: 'width_m', label: 'Width' },
    { key: 'height_m', label: 'Height' },
  ],
  stud: [
    { key: 'width_m', label: 'Width' },
    { key: 'depth_m', label: 'Depth' },
    { key: 'height_m', label: 'Height' },
  ],
  importedMesh: [{ key: 'scale', label: 'Scale' }],
}

/**
 * Which dimension grows when the gizmo is pulled on X, Y, or Z.
 * Pipe diameter is both Y and Z, so either handle changes the same number.
 */
export const SCALE_AXIS: Record<ObstacleType, { x?: string; y?: string; z?: string }> = {
  wall: { x: 'length_m', y: 'height_m', z: 'thickness_m' },
  column: { x: 'width_m', y: 'height_m', z: 'depth_m' },
  beam: { x: 'length_m', y: 'height_m', z: 'width_m' },
  duct: { x: 'length_m', y: 'height_m', z: 'width_m' },
  pipe: { x: 'length_m', y: 'diameter_m', z: 'diameter_m' },
  conduit: { x: 'length_m', y: 'diameter_m', z: 'diameter_m' },
  cableTray: { x: 'length_m', y: 'height_m', z: 'width_m' },
  sprinklerPipe: { x: 'length_m', y: 'diameter_m', z: 'diameter_m' },
  doorFrame: { x: 'depth_m', y: 'clearHeight_m', z: 'clearWidth_m' },
  pallet: { x: 'length_m', y: 'height_m', z: 'width_m' },
  cart: { x: 'length_m', y: 'height_m', z: 'width_m' },
  person: { x: 'depth_m', y: 'height_m', z: 'width_m' },
  scaffold: { x: 'length_m', y: 'height_m', z: 'width_m' },
  stud: { x: 'depth_m', y: 'height_m', z: 'width_m' },
  importedMesh: {},
}

/** Local box size [x, y, z] for types that are one box. Door frames are built separately. */
export function defaultDimensions(type: ObstacleType): Record<string, number> {
  switch (type) {
    case 'wall':
      return { length_m: 3, height_m: 2.4, thickness_m: 0.15 }
    case 'column':
      return { width_m: 0.4, depth_m: 0.4, height_m: 3 }
    case 'beam':
      return { length_m: 4, width_m: 0.3, height_m: 0.4 }
    case 'duct':
      return { length_m: 3, width_m: 0.6, height_m: 0.3 }
    case 'pipe':
      return { length_m: 3, diameter_m: 0.1 }
    case 'conduit':
      return { length_m: 2, diameter_m: 0.021 }
    case 'cableTray':
      return { length_m: 3, width_m: 0.3, height_m: 0.08 }
    case 'sprinklerPipe':
      return { length_m: 3, diameter_m: 0.04 }
    case 'doorFrame':
      // 32 in clear is the chassis width. 8 ft clear lets the stowed rails
      // (about 2.25 m) through so the gauntlet tests width, not height.
      return { clearWidth_m: 0.8128, clearHeight_m: 2.4384, depth_m: 0.15, jamb_m: 0.05 }
    case 'pallet':
      return { length_m: 1.22, width_m: 1.02, height_m: 0.15 }
    case 'cart':
      return { length_m: 0.8, width_m: 0.5, height_m: 1 }
    case 'person':
      return { width_m: 0.45, depth_m: 0.28, height_m: 1.75 }
    case 'scaffold':
      return { length_m: 2.5, width_m: 0.8, height_m: 2 }
    case 'stud':
      return { width_m: 0.038, depth_m: 0.089, height_m: 2.44 }
    case 'importedMesh':
      return { scale: 1 }
  }
}

export function defaultMaterial(type: ObstacleType): ObstacleMaterial {
  switch (type) {
    case 'wall':
    case 'stud':
      return 'drywall'
    case 'column':
    case 'beam':
    case 'pallet':
      return 'concrete'
    case 'duct':
    case 'pipe':
    case 'sprinklerPipe':
    case 'scaffold':
    case 'importedMesh':
      return 'steel'
    case 'conduit':
    case 'cableTray':
      return 'plastic'
    case 'doorFrame':
    case 'cart':
      return 'wood'
    case 'person':
      return 'fabric'
  }
}

const OVERHEAD: ReadonlySet<ObstacleType> = new Set([
  'beam',
  'duct',
  'pipe',
  'conduit',
  'cableTray',
  'sprinklerPipe',
])

/** Floor click: standing objects sit on the floor. Overhead objects hang near the ceiling. */
export function restingY_m(type: ObstacleType, ceilingHeight_m: number | null): number {
  const dims = defaultDimensions(type)
  if (type === 'doorFrame') {
    return 0
  }
  if (type === 'importedMesh') {
    return 0.5
  }
  const height = dims.height_m ?? dims.diameter_m ?? dims.clearHeight_m ?? 1
  if (OVERHEAD.has(type)) {
    const ceiling = ceilingHeight_m ?? 3
    return Math.max(height / 2, ceiling - height / 2)
  }
  return height / 2
}

export function newObstacleId(): string {
  return `obstacle-${Math.random().toString(36).slice(2, 8)}`
}

export function createObstacle(
  type: ObstacleType,
  position_m: [number, number, number],
  id = newObstacleId(),
): Obstacle {
  const material = defaultMaterial(type)
  return {
    id,
    type,
    position_m,
    yawPitchRoll_deg: [0, 0, 0],
    dimensions_m: defaultDimensions(type),
    reflectivity: MATERIAL_REFLECTIVITY[material],
    material,
    label: TYPE_LABELS[type],
  }
}

/** Fold a gizmo scale into the stored dimensions, then the matrix scale goes back to 1. */
export function bakeScale(
  type: ObstacleType,
  dimensions: Record<string, number>,
  scale: readonly [number, number, number],
): Record<string, number> {
  const axes = SCALE_AXIS[type]
  const factorFor: Record<string, number> = {}
  const bump = (key: string | undefined, factor: number) => {
    if (!key) {
      return
    }
    factorFor[key] = Math.max(factorFor[key] ?? 0, Math.abs(factor))
  }
  bump(axes.x, scale[0])
  bump(axes.y, scale[1])
  bump(axes.z, scale[2])
  const next = { ...dimensions }
  for (const [key, factor] of Object.entries(factorFor)) {
    next[key] = Math.max(0.001, (dimensions[key] ?? 0) * factor)
  }
  if (type === 'importedMesh') {
    const uniform = (Math.abs(scale[0]) + Math.abs(scale[1]) + Math.abs(scale[2])) / 3
    next.scale = Math.max(0.001, (dimensions.scale ?? 1) * uniform)
  }
  return next
}
