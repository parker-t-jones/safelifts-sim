/**
 * Coverage tab. The headline is the share of samples that a sensor
 * can see in time to stop. Self-occlusion is listed beside that, not inside it.
 */
import { coverageAssumptions } from '../coverage/assumptions'
import { OPERATOR_PRESET_LABELS, OPERATOR_PRESETS } from '../coverage/operator'
import { plannedHeights } from '../coverage/plan'
import {
  coverageFraction,
  GRID_DEFAULT_M,
  GRID_FINE_M,
  REGION_LABELS,
  REGIONS,
  usesDriveWarning,
  type FalseAlarm,
  type HeightId,
  type HeightReport,
  type RegionId,
} from '../coverage/types'
import {
  AMBIENT_LABELS,
  AMBIENT_LIGHTS,
  AMBIENT_RANGE_FACTOR,
  APPROXIMATE_MATERIALS,
} from '../sensors/derived'
import { useCoverageStore } from '../state/coverageStore'
import { useLiftStore } from '../state/liftStore'
import { useUiStore } from '../state/uiStore'
import { inchesToMeters, metersToInches } from '../units/convert'
import { formatLength } from '../units/format'
import { HeightChart, MapView, SliceView } from './CoverageViews'

const HEIGHTS: Array<{ id: HeightId; label: string }> = [
  { id: 'stowed', label: 'Stowed' },
  { id: 'threshold', label: 'Elevated threshold' },
  { id: 'max', label: 'Max' },
  { id: 'current', label: 'Current' },
]

export function CoveragePanel() {
  const spec = useLiftStore((state) => state.spec)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const setPlatformHeight = useLiftStore((state) => state.setPlatformHeight)
  const unitSystem = useUiStore((state) => state.unitSystem)
  const envelope_m = useCoverageStore((state) => state.envelope_m)
  const overhead_m = useCoverageStore((state) => state.overhead_m)
  const spacing_m = useCoverageStore((state) => state.spacing_m)
  const targetMaterial = useCoverageStore((state) => state.targetMaterial)
  const ambientLight = useCoverageStore((state) => state.ambientLight)
  const showCloud = useCoverageStore((state) => state.showCloud)
  const showSlice = useCoverageStore((state) => state.showSlice)
  const showMap = useCoverageStore((state) => state.showMap)
  const sliceY_m = useCoverageStore((state) => state.sliceY_m)
  const analysis = useCoverageStore((state) => state.analysis)
  const operator = useCoverageStore((state) => state.operator)
  const status = useCoverageStore((state) => state.status)
  const progress = useCoverageStore((state) => state.progress)
  const progressLabel = useCoverageStore((state) => state.progressLabel)
  const error = useCoverageStore((state) => state.error)
  const reports = useCoverageStore((state) => state.reports)
  const sweep = useCoverageStore((state) => state.sweep)
  const cloud = useCoverageStore((state) => state.cloud)
  const setEnvelope = useCoverageStore((state) => state.setEnvelope)
  const setOverhead = useCoverageStore((state) => state.setOverhead)
  const setSpacing = useCoverageStore((state) => state.setSpacing)
  const setTargetMaterial = useCoverageStore((state) => state.setTargetMaterial)
  const setAmbientLight = useCoverageStore((state) => state.setAmbientLight)
  const setShowCloud = useCoverageStore((state) => state.setShowCloud)
  const setShowSlice = useCoverageStore((state) => state.setShowSlice)
  const setShowMap = useCoverageStore((state) => state.setShowMap)
  const setSliceY = useCoverageStore((state) => state.setSliceY)
  const setAnalysis = useCoverageStore((state) => state.setAnalysis)
  const setOperator = useCoverageStore((state) => state.setOperator)

  const lengthUnit = unitSystem === 'metric' ? 'm' : 'in'
  const selectedHeight = heightFor(analysis, spec, platformHeight_m)
  const report =
    reports.find((item) => item.id === analysis) ??
    reports.find((item) => Math.abs(item.height_m - selectedHeight) < 0.02) ??
    null
  const cloudMatches = cloud !== null && Math.abs(cloud.height_m - selectedHeight) < 0.02

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Coverage</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          Samples fill a shell around the lift. The headline is how many front and rear samples a
          sensor can see in time to stop, for the material you pick. Hits on the lift itself are
          listed separately.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {HEIGHTS.map((item) => {
          const selected = item.id === analysis
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              className={
                selected
                  ? 'rounded-md bg-sky-600 px-2.5 py-1 text-sm font-medium text-white'
                  : 'rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-300 hover:bg-zinc-700'
              }
              onClick={() => setAnalysis(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-zinc-500">
        Checking {formatLength(selectedHeight, unitSystem)}. The platform on screen is{' '}
        {formatLength(platformHeight_m, unitSystem)}.
      </p>
      <button
        type="button"
        className="self-start rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-200 hover:bg-zinc-700"
        onClick={() => setPlatformHeight(selectedHeight)}
      >
        Move the platform to this height
      </button>

      {status === 'running' ? (
        <p className="text-sm text-sky-200">
          {progressLabel || 'Starting'}… {Math.round(progress * 100)}%
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {report ? <Headline report={report} /> : (
        <p className="text-sm text-zinc-400">
          {status === 'running' ? 'The first result will show up here.' : 'Open this tab to run coverage.'}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Shell</h3>
        <LengthField
          label={`Shell distance (${lengthUnit})`}
          length_m={envelope_m}
          unitSystem={unitSystem}
          onChange={setEnvelope}
        />
        <LengthField
          label={`Overhead column (${lengthUnit})`}
          length_m={overhead_m}
          unitSystem={unitSystem}
          onChange={setOverhead}
        />
        {report?.expanded ? (
          <p className="text-xs leading-relaxed text-amber-200/90">
            Shell expanded from {formatLength(report.requestedEnvelope_m, unitSystem)} to{' '}
            {formatLength(report.effectiveEnvelope_m, unitSystem)} so it stays 0.25 m past the
            worst-case warning distance ({formatLength(report.warningDistance_m ?? 0, unitSystem)}
            {report.warningLabel ? `, ${report.warningLabel}` : ', reaction and braking only'}).
          </p>
        ) : null}
        {report && report.warningDistance_m === null ? (
          <p className="text-xs leading-relaxed text-amber-200/90">
            The brake rate at this height is zero, so there is no finite warning distance. Every
            front and rear sample is too late, and the shell stays at the distance you typed.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Grid</h3>
        <div className="flex gap-1">
          <PresetButton
            label="5 cm"
            selected={Math.abs(spacing_m - GRID_DEFAULT_M) < 1e-6}
            onClick={() => setSpacing(GRID_DEFAULT_M)}
          />
          <PresetButton
            label="Fine (2.5 cm)"
            selected={Math.abs(spacing_m - GRID_FINE_M) < 1e-6}
            onClick={() => setSpacing(GRID_FINE_M)}
          />
        </div>
        <LengthField
          label={`Spacing (${lengthUnit})`}
          length_m={spacing_m}
          unitSystem={unitSystem}
          onChange={setSpacing}
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          5 cm is the default. Fine is 2.5 cm. You can type a coarser spacing. Doorway gaps tighter
          than a cell are for the lasers, not this grid.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Target material</h3>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Material a sensor has to see
          <select
            className={inputClass}
            aria-label="Target material"
            value={targetMaterial}
            onChange={(event) => setTargetMaterial(event.target.value)}
          >
            {APPROXIMATE_MATERIALS.map((material) => (
              <option key={material.name} value={material.name}>
                {material.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs leading-relaxed text-zinc-500">
          Can see uses rangeMax × √(ρ / ρ_ref) for this material, unless that sensor has a measured
          range filled in. The default material is the darkest one in the table. Radar keeps its
          own max range.
        </p>
        <p className="text-xs text-zinc-400">Ambient light</p>
        <div className="flex flex-wrap gap-1">
          {AMBIENT_LIGHTS.map((id) => (
            <PresetButton
              key={id}
              label={`${AMBIENT_LABELS[id]} (×${AMBIENT_RANGE_FACTOR[id]})`}
              selected={ambientLight === id}
              onClick={() => setAmbientLight(id)}
            />
          ))}
        </div>
        <p className="text-xs leading-relaxed text-zinc-500">
          These factors scale ToF range. They are approximate, not datasheet numbers. Indoor is the
          lighting a measured range assumes.
        </p>
      </section>

      {report ? <RegionTable report={report} /> : null}
      {report ? <Details report={report} unitSystem={unitSystem} /> : null}

      {reports.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-zinc-200">Three heights</h3>
          <ul className="flex flex-col gap-1 text-sm text-zinc-300">
            {plannedHeights(spec, analysis, platformHeight_m)
              .filter((item) => item.id !== 'current')
              .map((item) => {
                const match = reports.find((reportItem) => reportItem.id === item.id)
                const fraction = match ? coverageFraction(match.inTime) : null
                return (
                  <li key={item.id}>
                    {item.label} ({formatLength(item.height_m, unitSystem)}): {percent(fraction)} in time
                    {match?.expanded ? ' · shell expanded' : ''}
                  </li>
                )
              })}
          </ul>
          <HeightChart reports={reports} sweep={sweep} unitSystem={unitSystem} />
          <p className="text-xs leading-relaxed text-zinc-500">
            Large dots are the spacing you picked. Small dots are the 10 cm chart grid. The number
            is in-time coverage of the front and rear.
          </p>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Pictures</h3>
        <Check label="Point cloud in the 3D view" checked={showCloud} onChange={setShowCloud} />
        <p className="text-xs text-zinc-500">Green is 2 or more sensors. Yellow is one. Red is unseen. Purple is blocked by the lift or the operator.</p>
        <Check label="Horizontal slice" checked={showSlice} onChange={setShowSlice} />
        {showSlice && cloudMatches && cloud ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Slice height ({lengthUnit})
              <input
                type="range"
                min={0}
                max={Math.max(sliceY_m, selectedHeight + spec.guardrailHeight_m + overhead_m)}
                step={0.05}
                value={sliceY_m}
                aria-label="Slice height"
                onChange={(event) => setSliceY(Number(event.target.value))}
              />
            </label>
            <p className="text-xs text-zinc-500">{formatLength(sliceY_m, unitSystem)} · forward is up, right is right</p>
            <SliceView cloud={cloud} sliceY_m={sliceY_m} />
          </>
        ) : null}
        <Check label="Top-down map" checked={showMap} onChange={setShowMap} />
        {showMap && cloudMatches && cloud ? <MapView cloud={cloud} /> : null}
        {(showSlice || showMap) && !cloudMatches ? (
          <p className="text-xs text-zinc-500">The map appears when this height finishes.</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Operator</h3>
        <div className="flex flex-wrap gap-1">
          {OPERATOR_PRESETS.map((id) => (
            <PresetButton
              key={id}
              label={OPERATOR_PRESET_LABELS[id]}
              selected={operator.preset === id}
              onClick={() => setOperator({ preset: id })}
            />
          ))}
        </div>
        <Check
          label="Draw this pose on the platform"
          checked={operator.enabled}
          onChange={(enabled) => setOperator({ enabled })}
        />
        <LengthField
          label={`Height (${lengthUnit})`}
          length_m={operator.height_m}
          unitSystem={unitSystem}
          onChange={(height_m) => setOperator({ height_m })}
        />
        {operator.preset === 'controls' ? (
          <>
            <LengthField
              label={`Forward from center (${lengthUnit})`}
              length_m={operator.x_m}
              unitSystem={unitSystem}
              onChange={(x_m) => setOperator({ x_m })}
            />
            <LengthField
              label={`Right from center (${lengthUnit})`}
              length_m={operator.z_m}
              unitSystem={unitSystem}
              onChange={(z_m) => setOperator({ z_m })}
            />
          </>
        ) : null}
        <p className="text-xs leading-relaxed text-zinc-500">
          Every pose is checked. A sensor that can see any of them is listed below. Only the pose
          you draw blocks coverage samples. The corners stand inside the main platform. Leaning
          puts the chest about 0.3 m past the front rail.
        </p>
        {report && report.falseAlarms.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm text-amber-200">
            {alarmLines(report.falseAlarms).map((line) => (
              <li key={line.key}>
                {line.label} can see the operator: {line.presets}.
              </li>
            ))}
          </ul>
        ) : null}
        {report && report.falseAlarms.length === 0 ? (
          <p className="text-xs text-zinc-500">No sensor can see any of these poses at this height.</p>
        ) : null}
      </section>

      <details className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Model assumptions</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {coverageAssumptions().map((item) => (
            <li key={item.title}>
              <p className="text-sm text-zinc-200">{item.title}</p>
              <p className="text-xs leading-relaxed text-zinc-400">{item.detail}</p>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function Headline(props: { report: HeightReport }) {
  const inTime = coverageFraction(props.report.inTime)
  const tooLate = coverageFraction(props.report.tooLate)
  const blocked =
    props.report.inTime.points === 0 ? null : props.report.inTime.selfOccluded / props.report.inTime.points
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        In time · {props.report.targetMaterial} · {AMBIENT_LABELS[props.report.ambientLight]}
      </p>
      <p className="text-3xl font-medium text-zinc-100">{percent(inTime)}</p>
      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
        Front and rear samples farther than the warning distance that at least one sensor sees.
        This assumes {props.report.targetMaterial}, {AMBIENT_LABELS[props.report.ambientLight].toLowerCase()}{' '}
        light.
        {blocked !== null ? ` ${percent(blocked)} of that band is blocked by the lift or the operator.` : ''}
      </p>
      <p className="mt-2 text-sm text-zinc-300">Too late: {percent(tooLate)}</p>
      <p className="text-xs text-zinc-500">
        Front and rear samples inside the warning distance. Seeing them does not leave room to stop.
      </p>
    </section>
  )
}

function RegionTable(props: { report: HeightReport }) {
  const drive = REGIONS.filter((region) => usesDriveWarning(region))
  const other = REGIONS.filter((region) => !usesDriveWarning(region))
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-zinc-200">Regions</h3>
      <table className="w-full text-left text-xs text-zinc-300">
        <thead>
          <tr className="text-zinc-500">
            <th className="py-1 font-medium">Region</th>
            <th className="py-1 font-medium">In time</th>
            <th className="py-1 font-medium">Too late</th>
          </tr>
        </thead>
        <tbody>
          {drive.map((region) => (
            <RegionRow key={region} region={region} report={props.report} />
          ))}
        </tbody>
      </table>
      <table className="w-full text-left text-xs text-zinc-300">
        <thead>
          <tr className="text-zinc-500">
            <th className="py-1 font-medium">Region</th>
            <th className="py-1 font-medium">Seen</th>
          </tr>
        </thead>
        <tbody>
          {other.map((region) => (
            <RegionRow key={region} region={region} report={props.report} />
          ))}
        </tbody>
      </table>
      <p className="text-xs leading-relaxed text-zinc-500">
        Left, right, overhead, and the floor are seen or unseen. The stopping distance applies only
        while driving forward or back. Seen means a clear line of sight.
      </p>
    </section>
  )
}

function RegionRow(props: { region: RegionId; report: HeightReport }) {
  const stats = props.report.regions[props.region]
  if (usesDriveWarning(props.region)) {
    return (
      <tr className="border-t border-zinc-800">
        <td className="py-1">{REGION_LABELS[props.region]}</td>
        <td className="py-1">{percent(coverageFraction(stats.inTime))}</td>
        <td className="py-1">{percent(coverageFraction(stats.tooLate))}</td>
      </tr>
    )
  }
  return (
    <tr className="border-t border-zinc-800">
      <td className="py-1">{REGION_LABELS[props.region]}</td>
      <td className="py-1">{percent(coverageFraction(stats.seen))}</td>
    </tr>
  )
}

function alarmLines(alarms: readonly FalseAlarm[]): Array<{ key: string; label: string; presets: string }> {
  const order: string[] = []
  const grouped = new Map<string, { label: string; presets: FalseAlarm['presetId'][] }>()
  for (const alarm of alarms) {
    const key = `${alarm.placementId}:${alarm.sensorId}`
    const row = grouped.get(key)
    if (!row) {
      grouped.set(key, { label: alarm.label, presets: [alarm.presetId] })
      order.push(key)
      continue
    }
    if (!row.presets.includes(alarm.presetId)) {
      row.presets.push(alarm.presetId)
    }
  }
  return order.map((key) => {
    const row = grouped.get(key) as { label: string; presets: FalseAlarm['presetId'][] }
    return {
      key,
      label: row.label,
      presets: row.presets.map((id) => OPERATOR_PRESET_LABELS[id]).join(', '),
    }
  })
}

function Details(props: { report: HeightReport; unitSystem: 'imperial' | 'metric' }) {
  const { report, unitSystem } = props
  const { histogram, rays, blindSpot } = report
  return (
    <section className="flex flex-col gap-2 text-sm text-zinc-300">
      <h3 className="text-sm font-medium text-zinc-200">Overlap</h3>
      <p className="text-xs leading-relaxed text-zinc-400">
        Unseen {histogram.zero}. One sensor {histogram.one}. Two sensors {histogram.two}. Three or
        more {histogram.threePlus}. Blocked by the lift or operator {histogram.selfOccluded}.
      </p>
      <h3 className="text-sm font-medium text-zinc-200">Self-occluded rays</h3>
      <p className="text-xs leading-relaxed text-zinc-400">
        Chassis {rays.chassis}. Decks {rays.deck}. Rails {rays.rail}. Scissors {rays.scissor}.
        Modules {rays.module}. Operator {rays.operator}.
      </p>
      <h3 className="text-sm font-medium text-zinc-200">Largest blind spot</h3>
      {blindSpot ? (
        <p className="text-xs leading-relaxed text-zinc-400">
          About {formatLength(blindSpot.size_m[0], unitSystem)} by {formatLength(blindSpot.size_m[1], unitSystem)}{' '}
          by {formatLength(blindSpot.size_m[2], unitSystem)}, centered{' '}
          {formatLength(blindSpot.center_m[0], unitSystem)} forward, {formatLength(blindSpot.center_m[1], unitSystem)}{' '}
          up, and {formatLength(blindSpot.center_m[2], unitSystem)} right. Mostly {REGION_LABELS[blindSpot.region].toLowerCase()}.{' '}
          {blindSpot.points} unseen samples.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">No unseen samples at this height.</p>
      )}
    </section>
  )
}

function heightFor(
  analysis: HeightId,
  spec: { platformHeightMin_m: number; elevatedThreshold_m: number; platformHeightMax_m: number },
  current_m: number,
): number {
  if (analysis === 'stowed') return spec.platformHeightMin_m
  if (analysis === 'threshold') return spec.elevatedThreshold_m
  if (analysis === 'max') return spec.platformHeightMax_m
  return current_m
}

function percent(fraction: number | null): string {
  if (fraction === null) {
    return '—'
  }
  return `${Math.round(fraction * 100)}%`
}

function PresetButton(props: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      className={
        props.selected
          ? 'rounded-md bg-sky-600 px-2.5 py-1 text-sm font-medium text-white'
          : 'rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-300 hover:bg-zinc-700'
      }
      onClick={props.onClick}
    >
      {props.label}
    </button>
  )
}

function LengthField(props: {
  label: string
  length_m: number
  unitSystem: 'imperial' | 'metric'
  onChange: (length_m: number) => void
}) {
  const display = props.unitSystem === 'metric' ? props.length_m : metersToInches(props.length_m)
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {props.label}
      <input
        className={inputClass}
        type="number"
        step={props.unitSystem === 'metric' ? 0.01 : 0.1}
        value={Number.isFinite(display) ? Math.round(display * 1000) / 1000 : 0}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (!Number.isFinite(next)) {
            return
          }
          props.onChange(props.unitSystem === 'metric' ? next : inchesToMeters(next))
        }}
      />
    </label>
  )
}

function Check(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      {props.label}
    </label>
  )
}

const inputClass =
  'rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500'
