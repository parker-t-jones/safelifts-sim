/**
 * The 2D coverage pictures: one height slice, a top-down map,
 * and the in-time percentage across platform height.
 */
import { useEffect, useRef } from 'react'
import { coverageFraction, type CoverageCloud, type HeightReport, type SweepPoint } from '../coverage/types'
import { formatLength } from '../units/format'
import type { DisplayUnitSystem } from '../units/types'

const VIEW_WIDTH = 320
const VIEW_HEIGHT = 200

export function SliceView(props: { cloud: CoverageCloud; sliceY_m: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const { positions, counts, status, spacing_m } = props.cloud
    const kept: number[] = []
    const half = spacing_m / 2
    for (let index = 0; index < counts.length; index += 1) {
      const y = positions[index * 3 + 1]
      if (Math.abs(y - props.sliceY_m) <= half + 1e-6) {
        kept.push(index)
      }
    }
    paintTopDown(canvas, positions, counts, status, kept)
  }, [props.cloud, props.sliceY_m])

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_WIDTH}
      height={VIEW_HEIGHT}
      className="w-full rounded-md border border-zinc-800 bg-zinc-950"
      aria-label="Horizontal coverage slice"
    />
  )
}

export function MapView(props: { cloud: CoverageCloud }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const indexes: number[] = []
    for (let index = 0; index < props.cloud.counts.length; index += 1) {
      indexes.push(index)
    }
    paintTopDown(canvas, props.cloud.positions, props.cloud.counts, props.cloud.status, indexes)
  }, [props.cloud])

  return (
    <canvas
      ref={canvasRef}
      width={VIEW_WIDTH}
      height={VIEW_HEIGHT}
      className="w-full rounded-md border border-zinc-800 bg-zinc-950"
      aria-label="Top-down coverage map"
    />
  )
}

export function HeightChart(props: {
  reports: readonly HeightReport[]
  sweep: readonly SweepPoint[]
  unitSystem: DisplayUnitSystem
}) {
  const points = chartPoints(props.reports, props.sweep)
  if (points.length === 0) {
    return null
  }
  const width = VIEW_WIDTH
  const height = 140
  const pad = 28
  const minH = Math.min(...points.map((point) => point.height_m))
  const maxH = Math.max(...points.map((point) => point.height_m))
  const span = Math.max(maxH - minH, 0.01)
  const coords = points.map((point) => {
    const x = pad + ((point.height_m - minH) / span) * (width - pad * 2)
    const fraction = point.coverage ?? 0
    const y = height - pad - fraction * (height - pad * 2)
    return { ...point, x, y }
  })
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="In-time coverage versus platform height">
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#3f3f46" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#3f3f46" />
      <text x={pad} y={14} fill="#a1a1aa" fontSize="10">
        100% in time
      </text>
      <text x={pad} y={height - 8} fill="#a1a1aa" fontSize="10">
        {formatLength(minH, props.unitSystem)}
      </text>
      <text x={width - pad} y={height - 8} fill="#a1a1aa" fontSize="10" textAnchor="end">
        {formatLength(maxH, props.unitSystem)}
      </text>
      <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={line} />
      {coords.map((point) => (
        <circle
          key={point.height_m}
          cx={point.x}
          cy={point.y}
          r={point.coarse ? 2.5 : 4}
          fill={point.coverage === null ? '#71717a' : point.coarse ? '#7dd3fc' : '#0284c7'}
        />
      ))}
    </svg>
  )
}

function chartPoints(reports: readonly HeightReport[], sweep: readonly SweepPoint[]) {
  const points = reports.map((report) => ({
    height_m: report.height_m,
    coverage: coverageFraction(report.inTime),
    coarse: false,
  }))
  for (const item of sweep) {
    if (points.some((point) => Math.abs(point.height_m - item.height_m) < 0.02)) {
      continue
    }
    points.push({ height_m: item.height_m, coverage: item.inTimeCoverage, coarse: true })
  }
  points.sort((a, b) => a.height_m - b.height_m)
  return points
}

function paintTopDown(
  canvas: HTMLCanvasElement,
  positions: Float32Array,
  counts: Uint8Array,
  status: Uint8Array,
  indexes: readonly number[],
): void {
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#09090b'
  context.fillRect(0, 0, canvas.width, canvas.height)
  if (indexes.length === 0) {
    return
  }
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const index of indexes) {
    const x = positions[index * 3]
    const z = positions[index * 3 + 2]
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  const spanX = Math.max(maxX - minX, 0.05)
  const spanZ = Math.max(maxZ - minZ, 0.05)
  const pad = 12
  // Draw seen points first so a blind spot stays visible on top.
  const ordered = [...indexes].sort((a, b) => drawRank(status[b] ?? 0) - drawRank(status[a] ?? 0))
  for (const index of ordered) {
    const x = positions[index * 3]
    const z = positions[index * 3 + 2]
    const px = pad + ((z - minZ) / spanZ) * (canvas.width - pad * 2)
    const py = pad + (1 - (x - minX) / spanX) * (canvas.height - pad * 2)
    context.fillStyle = cssColor(status[index] ?? 0, counts[index] ?? 0)
    context.fillRect(px - 1.5, py - 1.5, 3, 3)
  }
}

function drawRank(status: number): number {
  if (status === 2) return 0
  if (status === 1) return 1
  return 2
}

function cssColor(status: number, count: number): string {
  if (status === 1) return '#c4b5fd'
  if (count >= 2) return '#4ade80'
  if (count === 1) return '#facc15'
  return '#f87171'
}
