/**
 * Coverage at one platform height.
 * A point is covered only when a sensor's field of view and range reach
 * it and the ray misses the lift. Hits on the lift are self-occlusion.
 * Hits on the operator are self-occlusion and a false-alarm flag.
 */
import type { LiftSpec } from '../lift/types'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import type { AmbientLight } from '../sensors/derived'
import type { SensorSpec } from '../sensors/types'
import type { SolidKind } from './boxes'
import { buildOccluder, type Occluder } from './occlusion'
import { sampleEnvelope, type Sample } from './envelope'
import { effectiveEnvelope_m, shellWasExpanded, warningAtHeight } from './shell'
import { allOperatorPoses, sensorsSeeingOperator } from './operator'
import { buildSolids } from './solids'
import {
  coverageSensors,
  inFieldOfView,
  inRange,
  viewFromSensor,
  type CoverageSensor,
} from './sensors'
import {
  emptyBand,
  emptyRays,
  type BandStats,
  type BlindSpot,
  type FalseAlarm,
  type HeightId,
  type HeightReport,
  type OperatorSpec,
  type PointStatus,
  type RayBlockCounts,
  type RegionId,
  REGIONS,
  type RegionStats,
} from './types'

export class CoverageCancelled extends Error {
  constructor() {
    super('Coverage run was replaced by a newer one.')
    this.name = 'CoverageCancelled'
  }
}

export interface AnalyzeArgs {
  id: HeightId
  spec: LiftSpec
  platformHeight_m: number
  modules: readonly SensorModule[]
  placements: readonly ModulePlacement[]
  sensorSpecs: readonly SensorSpec[]
  operator: OperatorSpec
  requestedEnvelope_m: number
  overhead_m: number
  spacing_m: number
  /** ToF "can see" uses effective max range at this reflectivity, unless a measured row replaces it. */
  targetReflectivity: number
  /** Named in the headline so the result says which material it assumed. */
  targetMaterial: string
  ambientLight: AmbientLight
  keepPoints: boolean
  /** Skip the blind-spot search on the coarse chart samples. */
  blindSpot: boolean
  onProgress?: (fraction: number) => void
  cancelled?: () => boolean
}

export interface AnalyzeOutput {
  report: HeightReport
  positions?: Float32Array
  counts?: Uint8Array
  status?: Uint8Array
}

interface PointRecord {
  sample: Sample
  count: number
  status: PointStatus
}

export async function analyzeHeight(args: AnalyzeArgs): Promise<AnalyzeOutput> {
  const warning = warningAtHeight(
    args.spec,
    args.platformHeight_m,
    args.modules,
    args.placements,
    args.sensorSpecs,
  )
  const envelope_m = effectiveEnvelope_m(args.requestedEnvelope_m, warning.warningDistance_m)
  const solids = buildSolids({
    spec: args.spec,
    platformHeight_m: args.platformHeight_m,
    modules: args.modules,
    placements: args.placements,
    operator: args.operator,
  })
  const sensors = coverageSensors({
    platformHeight_m: args.platformHeight_m,
    modules: args.modules,
    placements: args.placements,
    sensorSpecs: args.sensorSpecs,
    targetMaterial: args.targetMaterial,
    targetReflectivity: args.targetReflectivity,
    ambientLight: args.ambientLight,
  })
  const samples = sampleEnvelope(
    {
      spec: args.spec,
      platformHeight_m: args.platformHeight_m,
      solids,
      envelope_m,
      overhead_m: Math.max(0, args.overhead_m),
      warningDistance_m: warning.warningDistance_m,
    },
    args.spacing_m,
  )

  const occluder = buildOccluder(solids)
  // False alarms look at the lift alone. The drawn person is not in this mesh,
  // or a ray aimed at another preset would hit the drawn body first.
  const liftOnly = solids.some((solid) => solid.kind === 'operator')
    ? buildOccluder(solids.filter((solid) => solid.kind !== 'operator'))
    : occluder
  try {
    const classified = await classifySamples(samples, sensors, occluder, args.onProgress, args.cancelled)
    const alarms = sensorsSeeingOperator(
      args.platformHeight_m,
      allOperatorPoses(args.spec, args.operator),
      sensors,
      liftOnly,
    )
    const report = summarize(
      args,
      warning.warningDistance_m,
      warning.label,
      envelope_m,
      classified.records,
      classified.rays,
      alarms,
    )
    if (!args.keepPoints) {
      return { report }
    }
    const positions = new Float32Array(classified.records.length * 3)
    const counts = new Uint8Array(classified.records.length)
    const status = new Uint8Array(classified.records.length)
    for (let index = 0; index < classified.records.length; index += 1) {
      const record = classified.records[index]
      positions[index * 3] = record.sample.x
      positions[index * 3 + 1] = record.sample.y
      positions[index * 3 + 2] = record.sample.z
      counts[index] = record.count
      status[index] = record.status
    }
    return { report, positions, counts, status }
  } finally {
    occluder.dispose()
    if (liftOnly !== occluder) {
      liftOnly.dispose()
    }
  }
}

async function classifySamples(
  samples: readonly Sample[],
  sensors: readonly CoverageSensor[],
  occluder: Occluder,
  onProgress: ((fraction: number) => void) | undefined,
  cancelled: (() => boolean) | undefined,
): Promise<{ records: PointRecord[]; rays: RayBlockCounts }> {
  const records: PointRecord[] = []
  const rays = emptyRays()

  for (let index = 0; index < samples.length; index += 1) {
    if (index % 4000 === 0) {
      onProgress?.(samples.length === 0 ? 1 : index / samples.length)
      await new Promise((resolve) => setTimeout(resolve, 0))
      if (cancelled?.()) {
        throw new CoverageCancelled()
      }
    }
    const sample = samples[index]
    const point: [number, number, number] = [sample.x, sample.y, sample.z]
    let clear = 0
    let blocked = false
    for (const sensor of sensors) {
      const view = viewFromSensor(point, sensor)
      if (!inFieldOfView(view, sensor) || !inRange(view, sensor)) {
        continue
      }
      const hit = occluder.raycast(sensor.origin_m, point, sensor.ownSolidId)
      if (!hit) {
        clear += 1
        continue
      }
      blocked = true
      addRay(rays, hit.kind)
    }
    const status: PointStatus = clear > 0 ? 2 : blocked ? 1 : 0
    records.push({ sample, count: clear, status })
  }

  return { records, rays }
}

function addRay(rays: RayBlockCounts, kind: SolidKind): void {
  if (kind === 'basket') {
    return
  }
  rays[kind] += 1
}

function summarize(
  args: AnalyzeArgs,
  warningDistance_m: number | null,
  warningLabel: string | null,
  envelope_m: number,
  records: PointRecord[],
  rays: RayBlockCounts,
  alarms: FalseAlarm[],
): HeightReport {
  const inTime = emptyBand()
  const tooLate = emptyBand()
  const regions = emptyRegions()
  const histogram = { zero: 0, one: 0, two: 0, threePlus: 0, selfOccluded: 0 }

  for (const record of records) {
    if (record.sample.band === 'seen') {
      addPoint(regions[record.sample.region].seen, record)
    } else {
      // Headline totals are the drive direction only. A side sample is not in them.
      const band = record.sample.band === 'inTime' ? inTime : tooLate
      addPoint(band, record)
      addPoint(regions[record.sample.region][record.sample.band], record)
    }
    if (record.status === 1) {
      histogram.selfOccluded += 1
    } else if (record.count <= 0) {
      histogram.zero += 1
    } else if (record.count === 1) {
      histogram.one += 1
    } else if (record.count === 2) {
      histogram.two += 1
    } else {
      histogram.threePlus += 1
    }
  }

  return {
    id: args.id,
    height_m: args.platformHeight_m,
    spacing_m: args.spacing_m,
    warningDistance_m: warningDistance_m,
    warningLabel,
    requestedEnvelope_m: Math.max(0, args.requestedEnvelope_m),
    effectiveEnvelope_m: envelope_m,
    expanded: shellWasExpanded(args.requestedEnvelope_m, warningDistance_m),
    overhead_m: Math.max(0, args.overhead_m),
    targetMaterial: args.targetMaterial,
    ambientLight: args.ambientLight,
    sampleCount: records.length,
    inTime,
    tooLate,
    regions,
    histogram,
    blindSpot: args.blindSpot ? largestBlindSpot(records, args.spacing_m) : null,
    rays,
    falseAlarms: alarms,
  }
}

function addPoint(band: BandStats, record: PointRecord): void {
  band.points += 1
  if (record.status === 2) {
    band.covered += 1
  } else if (record.status === 1) {
    band.selfOccluded += 1
  } else {
    band.uncovered += 1
  }
}

function emptyRegions(): Record<RegionId, RegionStats> {
  return {
    front: { inTime: emptyBand(), tooLate: emptyBand(), seen: emptyBand() },
    rear: { inTime: emptyBand(), tooLate: emptyBand(), seen: emptyBand() },
    left: { inTime: emptyBand(), tooLate: emptyBand(), seen: emptyBand() },
    right: { inTime: emptyBand(), tooLate: emptyBand(), seen: emptyBand() },
    overhead: { inTime: emptyBand(), tooLate: emptyBand(), seen: emptyBand() },
    floor: { inTime: emptyBand(), tooLate: emptyBand(), seen: emptyBand() },
  }
}

function largestBlindSpot(records: readonly PointRecord[], spacing_m: number): BlindSpot | null {
  const uncovered = records.filter((record) => record.status === 0)
  if (uncovered.length === 0) {
    return null
  }
  const index = new Map<string, number>()
  for (let i = 0; i < uncovered.length; i += 1) {
    const sample = uncovered[i].sample
    index.set(`${sample.ix},${sample.iy},${sample.iz}`, i)
  }
  const seen = new Uint8Array(uncovered.length)
  let best: number[] = []
  const steps: Array<[number, number, number]> = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]
  for (let start = 0; start < uncovered.length; start += 1) {
    if (seen[start]) {
      continue
    }
    const stack = [start]
    seen[start] = 1
    const component = [start]
    while (stack.length > 0) {
      const current = stack.pop() as number
      const sample = uncovered[current].sample
      for (const [dx, dy, dz] of steps) {
        const next = index.get(`${sample.ix + dx},${sample.iy + dy},${sample.iz + dz}`)
        if (next === undefined || seen[next]) {
          continue
        }
        seen[next] = 1
        stack.push(next)
        component.push(next)
      }
    }
    if (component.length > best.length) {
      best = component
    }
  }

  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  const regionVotes = new Map<RegionId, number>()
  for (const pointer of best) {
    const sample = uncovered[pointer].sample
    minX = Math.min(minX, sample.x)
    minY = Math.min(minY, sample.y)
    minZ = Math.min(minZ, sample.z)
    maxX = Math.max(maxX, sample.x)
    maxY = Math.max(maxY, sample.y)
    maxZ = Math.max(maxZ, sample.z)
    regionVotes.set(sample.region, (regionVotes.get(sample.region) ?? 0) + 1)
  }
  let region: RegionId = 'front'
  let votes = -1
  for (const id of REGIONS) {
    const count = regionVotes.get(id) ?? 0
    if (count > votes) {
      votes = count
      region = id
    }
  }
  return {
    points: best.length,
    size_m: [maxX - minX + spacing_m, maxY - minY + spacing_m, maxZ - minZ + spacing_m],
    center_m: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    region,
  }
}
