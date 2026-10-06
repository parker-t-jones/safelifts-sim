/**
 * Starts a coverage job when the Coverage tab is open, or when the
 * point cloud is already on screen. The worker does the ray casts.
 */
import { useEffect, useRef } from 'react'
import { useLiftStore } from '../state/liftStore'
import { useModuleStore } from '../state/moduleStore'
import { usePlacementStore } from '../state/placementStore'
import { useSensorStore } from '../state/sensorStore'
import { useCoverageStore } from '../state/coverageStore'
import { useUiStore } from '../state/uiStore'
import type { CoverageJob, CoverageWorkerMessage } from './job'
import { plannedHeights, plannedSweep, sweepSpacing_m } from './plan'

/** Messages from an older job are ignored once a newer one has been posted. */
let latestPostedJobId = 0

export function CoverageRunner() {
  const sideTab = useUiStore((state) => state.sideTab)
  const spec = useLiftStore((state) => state.spec)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const modules = useModuleStore((state) => state.modules)
  const placements = usePlacementStore((state) => state.placements)
  const sensorSpecs = useSensorStore((state) => state.specs)
  const envelope_m = useCoverageStore((state) => state.envelope_m)
  const overhead_m = useCoverageStore((state) => state.overhead_m)
  const spacing_m = useCoverageStore((state) => state.spacing_m)
  const showCloud = useCoverageStore((state) => state.showCloud)
  const analysis = useCoverageStore((state) => state.analysis)
  const operator = useCoverageStore((state) => state.operator)
  const status = useCoverageStore((state) => state.status)
  const workerRef = useRef<Worker | null>(null)

  const engaged = sideTab === 'Coverage' || (showCloud && status !== 'idle')

  useEffect(() => {
    if (!engaged) {
      return
    }
    const timer = window.setTimeout(() => {
      const heights = plannedHeights(spec, analysis, platformHeight_m)
      const jobId = (latestPostedJobId += 1)
      const job: CoverageJob = {
        jobId,
        spec,
        modules,
        placements,
        sensorSpecs,
        operator,
        requestedEnvelope_m: envelope_m,
        overhead_m,
        spacing_m,
        heights,
        sweepHeights_m: plannedSweep(
          spec,
          heights.map((height) => height.height_m),
        ),
        sweepSpacing_m: sweepSpacing_m(spacing_m),
      }
      const worker = workerRef.current ?? createWorker()
      workerRef.current = worker
      useCoverageStore.getState().markRunning()
      worker.postMessage(job)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [
    engaged,
    spec,
    platformHeight_m,
    modules,
    placements,
    sensorSpecs,
    operator,
    envelope_m,
    overhead_m,
    spacing_m,
    analysis,
  ])

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  return null
}

function createWorker(): Worker {
  const worker = new Worker(new URL('./coverage.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (event: MessageEvent<CoverageWorkerMessage>) => {
    const message = event.data
    if (message.jobId !== latestPostedJobId) {
      return
    }
    const store = useCoverageStore.getState()
    if (message.type === 'progress') {
      store.setProgress(message.fraction, message.label)
      return
    }
    if (message.type === 'partial') {
      store.addPartial(message.report, message.cloud)
      return
    }
    if (message.type === 'error') {
      store.setError(message.message)
      return
    }
    store.setResult(message.reports, message.sweep, message.cloud)
  }
  worker.onerror = (event) => {
    useCoverageStore.getState().setError(event.message || 'Coverage failed.')
  }
  return worker
}
