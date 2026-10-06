/**
 * Phase presets and the four test scenes.
 * Generators leave the origin clear so the lift starts free to drive.
 * The same seed rebuilds the same obstacles. Regenerate replaces them.
 */
import { inchesToMeters, radiansToDegrees } from '../units/convert'
import { MATERIAL_REFLECTIVITY } from './defaults'
import { mulberry32 } from './random'
import type { Obstacle, ObstacleMaterial, ScenePhase, SiteScene } from './types'

export const PHASES: Array<Exclude<ScenePhase, 'custom'>> = [
  'structure',
  'mepRoughIn',
  'framingDrywall',
  'finishes',
]

export const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  structure: 'Structure',
  mepRoughIn: 'MEP rough-in',
  framingDrywall: 'Framing / drywall',
  finishes: 'Finishes',
}

export const EMPTY_SCENE: SiteScene = {
  id: 'scene-empty',
  name: 'Empty floor',
  phase: 'custom',
  floorSize_m: [30, 30],
  ceilingHeight_m: null,
  seed: 1,
  obstacles: [],
}

export function generatePhase(phase: (typeof PHASES)[number], seed: number): SiteScene {
  const random = mulberry32(seed)
  if (phase === 'structure') {
    return structureScene(seed, random)
  }
  if (phase === 'mepRoughIn') {
    return mepScene(seed, random)
  }
  if (phase === 'framingDrywall') {
    return framingScene(seed, random)
  }
  return finishesScene(seed, random)
}

export function regenerateScene(scene: SiteScene): SiteScene {
  if (scene.id === 'test-doors') {
    return doorGauntlet()
  }
  if (scene.id === 'test-overhead') {
    return overheadCourse()
  }
  if (scene.id === 'test-thin') {
    return thinObjects()
  }
  if (scene.id === 'test-dark') {
    return darkObjects()
  }
  if (scene.phase !== 'custom') {
    return generatePhase(scene.phase, scene.seed)
  }
  return scene
}

/** Clear widths of 32, 33, 34, 36, and 42 in. Height is 8 ft so stowed rails can enter. */
export function doorGauntlet(): SiteScene {
  const widths = [32, 33, 34, 36, 42]
  return {
    id: 'test-doors',
    name: 'Door gauntlet',
    phase: 'custom',
    floorSize_m: [28, 12],
    ceilingHeight_m: null,
    seed: 1,
    obstacles: widths.map((inches, index) =>
      obstacle({
        id: `door-${inches}`,
        type: 'doorFrame',
        position_m: [5 + index * 4, 0, 0],
        dimensions_m: {
          clearWidth_m: inchesToMeters(inches),
          clearHeight_m: inchesToMeters(96),
          depth_m: 0.15,
          jamb_m: 0.05,
        },
        material: 'wood',
        reflectivity: MATERIAL_REFLECTIVITY.wood,
        label: `${inches} in door`,
      }),
    ),
  }
}

/** Pipes and a duct the platform meets as it rises. Stowed driving passes underneath. */
export function overheadCourse(): SiteScene {
  const steps: Array<{ x: number; y: number; diameter: number }> = [
    { x: 4, y: 2.6, diameter: 0.12 },
    { x: 7, y: 3.2, diameter: 0.15 },
    { x: 10, y: 3.8, diameter: 0.2 },
    { x: 13, y: 4.6, diameter: 0.15 },
  ]
  const pipes = steps.map((step, index) =>
    obstacle({
      id: `overhead-pipe-${index}`,
      type: 'pipe',
      position_m: [step.x, step.y, 0],
      yawPitchRoll_deg: [spanYawDeg(), 0, 0],
      dimensions_m: { length_m: 4, diameter_m: step.diameter },
      material: 'steel',
      reflectivity: MATERIAL_REFLECTIVITY.steel,
      label: `Pipe at ${step.y.toFixed(1)} m`,
    }),
  )
  return {
    id: 'test-overhead',
    name: 'Overhead hazard course',
    phase: 'custom',
    floorSize_m: [20, 12],
    ceilingHeight_m: 5.2,
    seed: 1,
    obstacles: [
      ...pipes,
      obstacle({
        id: 'overhead-duct',
        type: 'duct',
        position_m: [8.5, 3.4, 0],
        yawPitchRoll_deg: [spanYawDeg(), 0, 0],
        dimensions_m: { length_m: 3.5, width_m: 0.6, height_m: 0.35 },
        material: 'steel',
        reflectivity: MATERIAL_REFLECTIVITY.steel,
        label: 'Duct',
      }),
    ],
  }
}

/** Conduit, rebar, and cable. Diameters are small on purpose. */
export function thinObjects(): SiteScene {
  const items: Array<{
    id: string
    label: string
    diameter_m: number
    material: ObstacleMaterial
    z: number
  }> = [
    { id: 'thin-rebar', label: 'Rebar', diameter_m: 0.006, material: 'steel', z: -1.2 },
    { id: 'thin-conduit', label: 'Conduit', diameter_m: 0.016, material: 'plastic', z: -0.4 },
    { id: 'thin-cable', label: 'Cable', diameter_m: 0.012, material: 'other', z: 0.4 },
    { id: 'thin-conduit-wide', label: 'Conduit', diameter_m: 0.027, material: 'plastic', z: 1.2 },
  ]
  return {
    id: 'test-thin',
    name: 'Thin objects',
    phase: 'custom',
    floorSize_m: [16, 12],
    ceilingHeight_m: null,
    seed: 1,
    obstacles: items.map((item) =>
      obstacle({
        id: item.id,
        type: 'conduit',
        // Pitch 90 stands the length upright.
        position_m: [4, 0.75, item.z],
        yawPitchRoll_deg: [0, 90, 0],
        dimensions_m: { length_m: 1.5, diameter_m: item.diameter_m },
        material: item.material,
        reflectivity: MATERIAL_REFLECTIVITY[item.material],
        label: item.label,
      }),
    ),
  }
}

/** Low-reflectivity pipes. 0.05 matches the black-rubber end of the sensor table. */
export function darkObjects(): SiteScene {
  const spots = [
    { id: 'dark-low', y: 0.5, z: 0 },
    { id: 'dark-mid', y: 1.2, z: 1.5 },
    { id: 'dark-high', y: 2, z: -1.5 },
  ]
  return {
    id: 'test-dark',
    name: 'Dark objects',
    phase: 'custom',
    floorSize_m: [16, 12],
    ceilingHeight_m: null,
    seed: 1,
    obstacles: spots.map((spot) =>
      obstacle({
        id: spot.id,
        type: 'pipe',
        position_m: [4, spot.y, spot.z],
        yawPitchRoll_deg: [spanYawDeg(), 0, 0],
        dimensions_m: { length_m: 2, diameter_m: 0.1 },
        material: 'steel',
        reflectivity: 0.05,
        label: 'Black pipe',
      }),
    ),
  }
}

function structureScene(seed: number, random: () => number): SiteScene {
  const ceiling = 4.5
  const obstacles: Obstacle[] = []
  const xs = [-10, -5, 5, 10]
  const zs = [-8, -4, 4, 8]
  for (const x of xs) {
    for (const z of zs) {
      obstacles.push(
        obstacle({
          id: `structure-column-${x}-${z}`,
          type: 'column',
          position_m: [x, ceiling / 2, z],
          dimensions_m: { width_m: 0.4, depth_m: 0.4, height_m: ceiling },
          material: 'concrete',
          reflectivity: MATERIAL_REFLECTIVITY.concrete,
          label: 'Column',
        }),
      )
    }
  }
  linkBeams(obstacles, 'structure', xs, zs, ceiling - 0.2, 0.3, 0.4)
  for (let index = 0; index < 3; index += 1) {
    const spot = clearSpot(random, 8, 6)
    obstacles.push(
      obstacle({
        id: `structure-pallet-${index}`,
        type: 'pallet',
        position_m: [spot.x, 0.075, spot.z],
        dimensions_m: { length_m: 1.22, width_m: 1.02, height_m: 0.15 },
        material: 'wood',
        reflectivity: MATERIAL_REFLECTIVITY.wood,
        label: 'Pallet',
      }),
    )
  }
  return scene(`phase-structure`, 'Structure', 'structure', seed, [24, 20], ceiling, obstacles)
}

function mepScene(seed: number, random: () => number): SiteScene {
  const ceiling = 3.6
  const obstacles: Obstacle[] = []
  obstacles.push(
    obstacle({
      id: 'mep-wall-a',
      type: 'wall',
      position_m: [8, 1.2, 0],
      yawPitchRoll_deg: [spanYawDeg(), 0, 0],
      dimensions_m: { length_m: 4, height_m: 2.4, thickness_m: 0.15 },
      material: 'concrete',
      reflectivity: MATERIAL_REFLECTIVITY.concrete,
      label: 'Partial wall',
    }),
    obstacle({
      id: 'mep-wall-b',
      type: 'wall',
      position_m: [-7, 1.2, 3],
      dimensions_m: { length_m: 3, height_m: 2.4, thickness_m: 0.15 },
      material: 'concrete',
      reflectivity: MATERIAL_REFLECTIVITY.concrete,
      label: 'Partial wall',
    }),
  )
  const runs: Array<{ id: string; type: Obstacle['type']; y: number; z: number; size: Record<string, number> }> = [
    { id: 'duct-a', type: 'duct', y: 3.15, z: 2.4, size: { length_m: 6, width_m: 0.5, height_m: 0.3 } },
    { id: 'duct-b', type: 'duct' as const, y: 3.05, z: -2.6, size: { length_m: 5, width_m: 0.4, height_m: 0.25 } },
    { id: 'pipe-a', type: 'pipe' as const, y: 2.9, z: 3.2, size: { length_m: 6, diameter_m: 0.1 } },
    { id: 'conduit-a', type: 'conduit' as const, y: 3.3, z: -3, size: { length_m: 5, diameter_m: 0.021 } },
    { id: 'tray-a', type: 'cableTray' as const, y: 3.35, z: 1.6, size: { length_m: 5, width_m: 0.3, height_m: 0.08 } },
    { id: 'sprinkler-a', type: 'sprinklerPipe' as const, y: 3.45, z: -1.6, size: { length_m: 6, diameter_m: 0.04 } },
  ]
  for (const run of runs) {
    const material = run.type === 'conduit' || run.type === 'cableTray' ? 'plastic' : 'steel'
    const y = run.y + (random() - 0.5) * 0.2
    obstacles.push(
      obstacle({
        id: `mep-${run.id}`,
        type: run.type,
        position_m: [2, Math.max(2.7, y), run.z],
        dimensions_m: run.size,
        material,
        reflectivity: MATERIAL_REFLECTIVITY[material],
        label: run.type === 'cableTray' ? 'Cable tray' : run.type === 'sprinklerPipe' ? 'Sprinkler' : run.type,
      }),
    )
  }
  return scene('phase-mep', 'MEP rough-in', 'mepRoughIn', seed, [24, 16], ceiling, obstacles)
}

function framingScene(seed: number, random: () => number): SiteScene {
  const obstacles: Obstacle[] = []
  for (let index = 0; index <= 16; index += 1) {
    const z = -3.2 + index * 0.4
    // A gap around z = 0 is the door opening. No slab fills it.
    if (Math.abs(z) < 0.5) {
      continue
    }
    obstacles.push(
      obstacle({
        id: `framing-stud-${index}`,
        type: 'stud',
        position_m: [7, 1.22, z],
        dimensions_m: { width_m: 0.038, depth_m: 0.089, height_m: 2.44 },
        material: 'wood',
        reflectivity: MATERIAL_REFLECTIVITY.wood,
        label: 'Stud',
      }),
    )
  }
  const stackZ = 4 + (random() - 0.5)
  obstacles.push(
    obstacle({
      id: 'framing-drywall',
      type: 'pallet',
      position_m: [-6, 0.4, stackZ],
      dimensions_m: { length_m: 1.22, width_m: 0.6, height_m: 0.8 },
      material: 'drywall',
      reflectivity: MATERIAL_REFLECTIVITY.drywall,
      label: 'Drywall stack',
    }),
    obstacle({
      id: 'framing-cart',
      type: 'cart',
      position_m: [5, 0.5, -5],
      dimensions_m: { length_m: 0.9, width_m: 0.5, height_m: 1 },
      material: 'steel',
      reflectivity: MATERIAL_REFLECTIVITY.steel,
      label: 'Cart',
    }),
  )
  return scene('phase-framing', 'Framing / drywall', 'framingDrywall', seed, [22, 16], 3, obstacles)
}

function finishesScene(seed: number, random: () => number): SiteScene {
  const ceiling = 2.8
  const obstacles: Obstacle[] = [
    obstacle({
      id: 'finish-wall-left',
      type: 'wall',
      position_m: [-2.1, 1.35, 6],
      dimensions_m: { length_m: 3.2, height_m: 2.7, thickness_m: 0.12 },
      material: 'drywall',
      reflectivity: MATERIAL_REFLECTIVITY.drywall,
      label: 'Wall',
    }),
    obstacle({
      id: 'finish-wall-right',
      type: 'wall',
      position_m: [2.1, 1.35, 6],
      dimensions_m: { length_m: 3.2, height_m: 2.7, thickness_m: 0.12 },
      material: 'drywall',
      reflectivity: MATERIAL_REFLECTIVITY.drywall,
      label: 'Wall',
    }),
    obstacle({
      id: 'finish-door',
      type: 'doorFrame',
      position_m: [0, 0, 6],
      // The wall runs along X, so the opening faces +Z.
      yawPitchRoll_deg: [spanYawDeg(), 0, 0],
      dimensions_m: {
        clearWidth_m: inchesToMeters(36),
        clearHeight_m: inchesToMeters(96),
        depth_m: 0.12,
        jamb_m: 0.04,
      },
      material: 'wood',
      reflectivity: MATERIAL_REFLECTIVITY.wood,
      label: 'Door frame',
    }),
    obstacle({
      id: 'finish-cart',
      type: 'cart',
      position_m: [5, 0.45, 3 + (random() - 0.5)],
      dimensions_m: { length_m: 0.8, width_m: 0.5, height_m: 0.9 },
      material: 'plastic',
      reflectivity: MATERIAL_REFLECTIVITY.plastic,
      label: 'Cart',
    }),
  ]
  for (const x of [-6, -2, 2, 6]) {
    obstacles.push(
      obstacle({
        id: `finish-grid-x-${x}`,
        type: 'beam',
        position_m: [x, ceiling - 0.02, 0],
        yawPitchRoll_deg: [spanYawDeg(), 0, 0],
        dimensions_m: { length_m: 12, width_m: 0.04, height_m: 0.04 },
        material: 'steel',
        reflectivity: MATERIAL_REFLECTIVITY.steel,
        label: 'Ceiling grid',
      }),
    )
  }
  for (const z of [-4, 4]) {
    obstacles.push(
      obstacle({
        id: `finish-grid-z-${z}`,
        type: 'beam',
        position_m: [0, ceiling - 0.02, z],
        dimensions_m: { length_m: 12, width_m: 0.04, height_m: 0.04 },
        material: 'steel',
        reflectivity: MATERIAL_REFLECTIVITY.steel,
        label: 'Ceiling grid',
      }),
    )
  }
  return scene('phase-finishes', 'Finishes', 'finishes', seed, [20, 16], ceiling, obstacles)
}

function linkBeams(
  obstacles: Obstacle[],
  prefix: string,
  xs: number[],
  zs: number[],
  y: number,
  width: number,
  height: number,
): void {
  for (const z of zs) {
    for (let index = 0; index < xs.length - 1; index += 1) {
      const x0 = xs[index]
      const x1 = xs[index + 1]
      obstacles.push(
        obstacle({
          id: `${prefix}-beam-x-${z}-${index}`,
          type: 'beam',
          position_m: [(x0 + x1) / 2, y, z],
          dimensions_m: { length_m: Math.abs(x1 - x0), width_m: width, height_m: height },
          material: 'concrete',
          reflectivity: MATERIAL_REFLECTIVITY.concrete,
          label: 'Beam',
        }),
      )
    }
  }
  for (const x of xs) {
    for (let index = 0; index < zs.length - 1; index += 1) {
      const z0 = zs[index]
      const z1 = zs[index + 1]
      obstacles.push(
        obstacle({
          id: `${prefix}-beam-z-${x}-${index}`,
          type: 'beam',
          position_m: [x, y, (z0 + z1) / 2],
          yawPitchRoll_deg: [spanYawDeg(), 0, 0],
          dimensions_m: { length_m: Math.abs(z1 - z0), width_m: width, height_m: height },
          material: 'concrete',
          reflectivity: MATERIAL_REFLECTIVITY.concrete,
          label: 'Beam',
        }),
      )
    }
  }
}

/** Yaw that aims local +X along world +Z, so a pipe can span the drive path. */
function spanYawDeg(): number {
  return radiansToDegrees(Math.atan2(-1, 0))
}

function clearSpot(random: () => number, spanX: number, spanZ: number): { x: number; z: number } {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const x = (random() * 2 - 1) * spanX
    const z = (random() * 2 - 1) * spanZ
    if (Math.hypot(x, z) > 4) {
      return { x, z }
    }
  }
  return { x: 6, z: 6 }
}

function scene(
  id: string,
  name: string,
  phase: ScenePhase,
  seed: number,
  floorSize_m: [number, number],
  ceilingHeight_m: number | null,
  obstacles: Obstacle[],
): SiteScene {
  return { id, name, phase, floorSize_m, ceilingHeight_m, seed, obstacles }
}

function obstacle(args: {
  id: string
  type: Obstacle['type']
  position_m: [number, number, number]
  yawPitchRoll_deg?: [number, number, number]
  dimensions_m: Record<string, number>
  material: ObstacleMaterial
  reflectivity: number
  label: string
}): Obstacle {
  return {
    id: args.id,
    type: args.type,
    position_m: args.position_m,
    yawPitchRoll_deg: args.yawPitchRoll_deg ?? [0, 0, 0],
    dimensions_m: args.dimensions_m,
    reflectivity: args.reflectivity,
    material: args.material,
    label: args.label,
  }
}
