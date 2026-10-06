/**
 * Coverage runs here so the page keeps drawing while the rays are cast.
 * A newer job replaces an older one the next time the loop yields.
 */
import { analyzeHeight, CoverageCancelled } from './analyze'
import type { CoverageJob, CoverageWorkerMessage } from './job'
import { coverageFraction, type CoverageCloud, type SweepPoint } from './types'

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<CoverageJob>) => void) | null
  postMessage: (message: CoverageWorkerMessage, transfer?: Transferable[]) => void
}

let latestJobId = 0

scope.onmessage = (event: MessageEvent<CoverageJob>) => {
  latestJobId = event.data.jobId
  void runJob(event.data)
}

async function runJob(job: CoverageJob): Promise<void> {
  try {
    const reports = []
    const ordered = [...job.heights].sort((a, b) => Number(b.keepPoints) - Number(a.keepPoints))
    const steps = ordered.length + job.sweepHeights_m.length
    let cloud: CoverageCloud | null = null

    for (let index = 0; index < ordered.length; index += 1) {
      const height = ordered[index]
      const output = await analyzeHeight({
        id: height.id,
        spec: job.spec,
        platformHeight_m: height.height_m,
        modules: job.modules,
        placements: job.placements,
        sensorSpecs: job.sensorSpecs,
        operator: job.operator,
        requestedEnvelope_m: job.requestedEnvelope_m,
        overhead_m: job.overhead_m,
        spacing_m: job.spacing_m,
        keepPoints: height.keepPoints,
        blindSpot: height.blindSpot,
        cancelled: () => latestJobId !== job.jobId,
        onProgress: (fraction) => {
          post({
            type: 'progress',
            jobId: job.jobId,
            fraction: (index + fraction) / Math.max(steps, 1),
            label: height.label,
          })
        },
      })
      if (latestJobId !== job.jobId) {
        return
      }
      reports.push(output.report)
      if (output.positions && output.counts && output.status) {
        cloud = {
          heightId: height.id,
          height_m: height.height_m,
          spacing_m: job.spacing_m,
          positions: output.positions,
          counts: output.counts,
          status: output.status,
        }
      }
      // Show the selected height before the chart finishes.
      post({
        type: 'partial',
        jobId: job.jobId,
        report: output.report,
        cloud: cloud && height.keepPoints ? cloud : null,
      })
    }

    const sweep: SweepPoint[] = []
    for (let index = 0; index < job.sweepHeights_m.length; index += 1) {
      const height_m = job.sweepHeights_m[index]
      const output = await analyzeHeight({
        id: 'current',
        spec: job.spec,
        platformHeight_m: height_m,
        modules: job.modules,
        placements: job.placements,
        sensorSpecs: job.sensorSpecs,
        operator: job.operator,
        requestedEnvelope_m: job.requestedEnvelope_m,
        overhead_m: job.overhead_m,
        spacing_m: job.sweepSpacing_m,
        keepPoints: false,
        blindSpot: false,
        cancelled: () => latestJobId !== job.jobId,
        onProgress: (fraction) => {
          post({
            type: 'progress',
            jobId: job.jobId,
            fraction: (ordered.length + index + fraction) / Math.max(steps, 1),
            label: 'Height chart',
          })
        },
      })
      if (latestJobId !== job.jobId) {
        return
      }
      sweep.push({
        height_m,
        inTimeCoverage: coverageFraction(output.report.inTime),
        spacing_m: job.sweepSpacing_m,
      })
    }

    post({
      type: 'done',
      jobId: job.jobId,
      reports,
      sweep,
      cloud,
    })
  } catch (error) {
    if (error instanceof CoverageCancelled || latestJobId !== job.jobId) {
      return
    }
    post({
      type: 'error',
      jobId: job.jobId,
      message: error instanceof Error ? error.message : 'Coverage failed.',
    })
  }
}

function post(message: CoverageWorkerMessage): void {
  scope.postMessage(message)
}
