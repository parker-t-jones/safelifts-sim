/**
 * The lift's collision boxes at one platform height, in the lift frame.
 * Rails and scissors match the shapes drawn in LiftModel so a ray that
 * hits the picture also hits the coverage model.
 */
import { DECK_THICKNESS_M } from '../lift/visual'
import type { LiftSpec } from '../lift/types'
import { rotateMount } from '../modules/frames'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import { alignedBox, barBox, type SolidBox } from './boxes'
import { operatorPose } from './operator'
import type { OperatorSpec } from './types'

/** Square post width. Same number as the white posts in LiftModel. */
const RAIL_POST_M = 0.045

/** Top-rail cross section. Same number as the drawn rails. */
const RAIL_BAR_M = 0.03

/** Scissor tube diameter. The drawing uses a cylinder of this radius times two. */
const SCISSOR_THICKNESS_M = 0.09

export function buildSolids(args: {
  spec: LiftSpec
  platformHeight_m: number
  modules: readonly SensorModule[]
  placements: readonly ModulePlacement[]
  operator: OperatorSpec
}): SolidBox[] {
  const { spec, platformHeight_m: floorY } = args
  const boxes: SolidBox[] = []

  boxes.push(
    alignedBox(
      'chassis',
      'chassis',
      true,
      true,
      [0, spec.chassisHeight_m / 2, 0],
      [spec.chassisLength_m, spec.chassisHeight_m, spec.chassisWidth_m],
    ),
  )

  const deckY = floorY - DECK_THICKNESS_M / 2
  boxes.push(
    alignedBox(
      'deck-main',
      'deck',
      true,
      true,
      [0, deckY, 0],
      [spec.platformLength_m, DECK_THICKNESS_M, spec.platformWidth_m],
    ),
  )

  const extension = Math.max(0, spec.extensionDeckLength_m)
  if (extension > 0) {
    boxes.push(
      alignedBox(
        'deck-extension',
        'deck',
        true,
        true,
        [spec.platformLength_m / 2 + extension / 2, deckY, 0],
        [extension, DECK_THICKNESS_M, spec.platformWidth_m],
      ),
    )
  }

  // The cage is a volume for "inside the basket" and for distance to the
  // rail outline. Rays use the thin rails below, so they can pass through
  // the open top and the gaps between bars.
  const railHeight = Math.max(0, spec.guardrailHeight_m)
  if (railHeight > 0) {
    boxes.push(
      alignedBox(
        'basket-main',
        'basket',
        true,
        false,
        [0, floorY + railHeight / 2, 0],
        [spec.platformLength_m, railHeight, spec.platformWidth_m],
      ),
    )
    if (extension > 0) {
      boxes.push(
        alignedBox(
          'basket-extension',
          'basket',
          true,
          false,
          [spec.platformLength_m / 2 + extension / 2, floorY + railHeight / 2, 0],
          [extension, railHeight, spec.platformWidth_m],
        ),
      )
    }
  }

  addRails(boxes, spec, floorY, extension)
  addScissors(boxes, spec, floorY)

  for (const placement of args.placements) {
    const module = args.modules.find((item) => item.id === placement.moduleId)
    if (!module) {
      continue
    }
    boxes.push(moduleBox(placement, module, floorY))
  }

  if (args.operator.enabled) {
    // The drawn pose is the only body in the shell. The other presets are
    // checked separately, so four people are not standing in the point cloud.
    for (const part of operatorPose(args.spec, args.operator).parts) {
      boxes.push(
        alignedBox(
          `operator-${part.name}`,
          'operator',
          false,
          true,
          [part.center_m[0], floorY + part.center_m[1], part.center_m[2]],
          part.size_m,
        ),
      )
    }
  }

  return boxes
}

function addRails(boxes: SolidBox[], spec: LiftSpec, floorY: number, extension: number): void {
  const height = Math.max(0, spec.guardrailHeight_m)
  if (height === 0) {
    return
  }
  addRailRun(boxes, 'main', {
    x0: -spec.platformLength_m / 2,
    x1: spec.platformLength_m / 2,
    z0: -spec.platformWidth_m / 2,
    z1: spec.platformWidth_m / 2,
    floorY,
    height,
    includeRear: true,
  })
  if (extension > 0) {
    addRailRun(boxes, 'extension', {
      x0: spec.platformLength_m / 2,
      x1: spec.platformLength_m / 2 + extension,
      z0: -spec.platformWidth_m / 2,
      z1: spec.platformWidth_m / 2,
      floorY,
      height,
      includeRear: false,
    })
  }
}

function addRailRun(
  boxes: SolidBox[],
  name: string,
  run: {
    x0: number
    x1: number
    z0: number
    z1: number
    floorY: number
    height: number
    includeRear: boolean
  },
): void {
  const { x0, x1, z0, z1, floorY, height, includeRear } = run
  const yMid = floorY + height / 2
  const yTop = floorY + height
  const posts: Array<[number, number]> = [
    [x1, z0],
    [x1, z1],
  ]
  if (includeRear) {
    posts.push([x0, z0], [x0, z1])
  }
  for (const [x, z] of posts) {
    boxes.push(
      alignedBox(`rail-post-${name}-${x}-${z}`, 'rail', false, true, [x, yMid, z], [RAIL_POST_M, height, RAIL_POST_M]),
    )
  }
  const spanZ = Math.abs(z1 - z0)
  const spanX = Math.abs(x1 - x0)
  boxes.push(
    alignedBox(
      `rail-front-${name}`,
      'rail',
      false,
      true,
      [x1, yTop, (z0 + z1) / 2],
      [RAIL_BAR_M, RAIL_BAR_M, spanZ],
    ),
  )
  if (includeRear) {
    boxes.push(
      alignedBox(
        `rail-rear-${name}`,
        'rail',
        false,
        true,
        [x0, yTop, (z0 + z1) / 2],
        [RAIL_BAR_M, RAIL_BAR_M, spanZ],
      ),
    )
  }
  boxes.push(
    alignedBox(
      `rail-left-${name}`,
      'rail',
      false,
      true,
      [(x0 + x1) / 2, yTop, z0],
      [spanX, RAIL_BAR_M, RAIL_BAR_M],
    ),
    alignedBox(
      `rail-right-${name}`,
      'rail',
      false,
      true,
      [(x0 + x1) / 2, yTop, z1],
      [spanX, RAIL_BAR_M, RAIL_BAR_M],
    ),
  )
}

/**
 * Same X layout as the drawn scissors: three bays, two sides, crossing bars.
 * They block rays. They are not the surface the shell is measured from.
 */
function addScissors(boxes: SolidBox[], spec: LiftSpec, floorY: number): void {
  const y0 = spec.chassisHeight_m
  const rise = Math.max(floorY - y0, 0.05)
  const bays = 3
  const bayRise = rise / bays
  const span = Math.max(spec.chassisLength_m * 0.62, 0.4)
  const sideZ = spec.chassisWidth_m * 0.42
  for (let bay = 0; bay < bays; bay += 1) {
    const yA = y0 + bay * bayRise
    const yB = yA + bayRise
    for (const z of [-sideZ, sideZ]) {
      boxes.push(
        barBox(`scissor-${bay}-${z}-a`, 'scissor', [-span / 2, yA, z], [span / 2, yB, z], SCISSOR_THICKNESS_M),
        barBox(`scissor-${bay}-${z}-b`, 'scissor', [span / 2, yA, z], [-span / 2, yB, z], SCISSOR_THICKNESS_M),
      )
    }
  }
}

function moduleBox(placement: ModulePlacement, module: SensorModule, floorY: number): SolidBox {
  const [sx, sy, sz] = module.housingSize_m
  const rotatedX = rotateMount([1, 0, 0], placement.yawPitchRoll_deg)
  const rotatedY = rotateMount([0, 1, 0], placement.yawPitchRoll_deg)
  const rotatedZ = rotateMount([0, 0, 1], placement.yawPitchRoll_deg)
  const y = placement.attachTo === 'platform' ? placement.position_m[1] + floorY : placement.position_m[1]
  return {
    id: `module-${placement.id}`,
    kind: 'module',
    surface: true,
    occlude: true,
    center_m: [placement.position_m[0], y, placement.position_m[2]],
    half_m: [Math.abs(sx) / 2, Math.abs(sy) / 2, Math.abs(sz) / 2],
    axisX: rotatedX,
    axisY: rotatedY,
    axisZ: rotatedZ,
  }
}
