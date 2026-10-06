/**
 * Sensors tab: the sensor library. Every VL53L8CX number is marked
 * approximate until it is checked against the datasheet.
 * Angles are edited in degrees. Frustums are drawn from placed modules.
 */
import { sensorAssumptions } from '../sensors/assumptions'
import {
  APPROXIMATE_MATERIALS,
  ZONE_FOOTPRINT_DISTANCES_M,
  activeMode,
  effectiveMax_m,
  tofSeeingRange_m,
  sensorDelay_s,
  updatePeriod_s,
  zoneAngle_deg,
  zoneFootprint_m,
} from '../sensors/derived'
import type { SensorKind, SensorSpec } from '../sensors/types'
import { brakeDecel_mps2, speedLimit_mps, warningDistance_m } from '../lift/kinematics'
import { useLiftStore } from '../state/liftStore'
import { useSensorStore } from '../state/sensorStore'
import { useUiStore } from '../state/uiStore'
import { inchesToMeters, metersToInches } from '../units/convert'
import { formatLength, formatSpeed } from '../units/format'

const inputClass =
  'rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500'

export function SensorsPanel() {
  const specs = useSensorStore((state) => state.specs)
  const selectedId = useSensorStore((state) => state.selectedId)
  const select = useSensorStore((state) => state.select)
  const createTof = useSensorStore((state) => state.createTof)
  const createRadar = useSensorStore((state) => state.createRadar)
  const duplicate = useSensorStore((state) => state.duplicate)
  const remove = useSensorStore((state) => state.remove)
  const spec = specs.find((item) => item.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Sensors</h2>
        <p className="mt-1 text-sm leading-relaxed text-amber-200/90">
          VL53L8CX numbers are approximate until they are confirmed against the datasheet. The
          radar template is a placeholder.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {specs.map((item) => {
          const mode = activeMode(item)
          const selected = item.id === selectedId
          return (
            <button
              key={item.id}
              type="button"
              className={
                selected
                  ? 'rounded-md bg-sky-600 px-2 py-1.5 text-left text-sm text-white'
                  : 'rounded-md bg-zinc-800 px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-700'
              }
              onClick={() => select(item.id)}
            >
              {item.name}
              {mode ? ` — ${mode.name}, ${mode.updateRate_hz} Hz` : ''}
              {item.approximate ? ' · approximate' : ''}
            </button>
          )
        })}
        {specs.length === 0 && <p className="text-sm text-zinc-400">No sensors yet.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <SmallButton label="New ToF" onClick={createTof} />
        <SmallButton label="New radar" onClick={createRadar} />
        <SmallButton label="Duplicate" onClick={() => spec && duplicate(spec.id)} disabled={!spec} />
        <SmallButton label="Delete" onClick={() => spec && remove(spec.id)} disabled={!spec} />
      </div>

      {spec && <SensorEditor spec={spec} />}

      <details className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Model assumptions</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {sensorAssumptions().map((item) => (
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

function SensorEditor(props: { spec: SensorSpec }) {
  const spec = props.spec
  const updateSpec = useSensorStore((state) => state.updateSpec)
  const updateMode = useSensorStore((state) => state.updateMode)
  const setActiveMode = useSensorStore((state) => state.setActiveMode)
  const addMode = useSensorStore((state) => state.addMode)
  const deleteMode = useSensorStore((state) => state.deleteMode)
  const unitSystem = useUiStore((state) => state.unitSystem)
  const lengthUnit = unitSystem === 'metric' ? 'm' : 'in'
  const mode = activeMode(spec)
  const horizontal = mode ? zoneAngle_deg(spec.fovH_deg, mode.zonesX) : null
  const vertical = mode ? zoneAngle_deg(spec.fovV_deg, mode.zonesY) : null

  return (
    <div className="flex flex-col gap-4">
      <NumberField
        label="Name"
        text
        value={spec.name}
        onText={(name) => updateSpec(spec.id, { name })}
      />
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Kind
        <select
          className={inputClass}
          value={spec.kind}
          onChange={(event) => updateSpec(spec.id, kindPatch(spec, event.target.value as SensorKind))}
        >
          <option value="tof-multizone">Multizone ToF</option>
          <option value="tof-single">Single-zone ToF</option>
          <option value="radar">Radar</option>
        </select>
      </label>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Optics (approximate)</h3>
        <NumberField
          label="Horizontal field of view (deg)"
          value={spec.fovH_deg}
          step={1}
          onChange={(fovH_deg) => updateSpec(spec.id, { fovH_deg: Math.abs(fovH_deg) })}
        />
        <NumberField
          label="Vertical field of view (deg)"
          value={spec.fovV_deg}
          step={1}
          onChange={(fovV_deg) => updateSpec(spec.id, { fovV_deg: Math.abs(fovV_deg) })}
        />
        <NumberField
          label={`Minimum range (${lengthUnit})`}
          value={lengthToDisplay(spec.rangeMin_m, unitSystem)}
          step={unitSystem === 'metric' ? 0.01 : 0.1}
          onChange={(display) =>
            updateSpec(spec.id, { rangeMin_m: Math.max(0, lengthFromDisplay(display, unitSystem)) })
          }
        />
        <NumberField
          label={`Maximum range (${lengthUnit})`}
          value={lengthToDisplay(spec.rangeMax_m, unitSystem)}
          step={unitSystem === 'metric' ? 0.01 : 0.1}
          onChange={(display) =>
            updateSpec(spec.id, { rangeMax_m: Math.max(0, lengthFromDisplay(display, unitSystem)) })
          }
        />
        <NumberField
          label="Processing latency (s)"
          value={spec.processingLatency_s}
          step={0.005}
          onChange={(seconds) => updateSpec(spec.id, { processingLatency_s: Math.max(0, seconds) })}
        />
        <NumberField
          label="Frames to confirm"
          value={spec.framesToConfirm}
          step={1}
          onChange={(frames) =>
            updateSpec(spec.id, { framesToConfirm: Math.max(0, Math.round(frames)) })
          }
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          Approximate. A confirmed reading waits this many update periods, then the processing
          latency. The HUD straight-line stop does not include either one yet.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Resolution modes</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Each mode has its own zone grid and update rate. The selected mode is the one placed
          modules and the preview warning distance use.
        </p>
        {spec.modes.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-md border border-zinc-800 p-2">
            <label className="flex items-center gap-2 text-sm text-zinc-200">
              <input
                type="radio"
                name={`mode-${spec.id}`}
                checked={item.id === spec.activeModeId}
                onChange={() => setActiveMode(spec.id, item.id)}
              />
              Active
            </label>
            <NumberField
              label="Mode name"
              text
              value={item.name}
              onText={(name) => updateMode(spec.id, item.id, { name })}
            />
            {spec.kind !== 'radar' && (
              <>
                <NumberField
                  label="Zones across"
                  value={item.zonesX}
                  step={1}
                  onChange={(zonesX) =>
                    updateMode(spec.id, item.id, { zonesX: Math.max(1, Math.round(zonesX)) })
                  }
                />
                <NumberField
                  label="Zones down"
                  value={item.zonesY}
                  step={1}
                  onChange={(zonesY) =>
                    updateMode(spec.id, item.id, { zonesY: Math.max(1, Math.round(zonesY)) })
                  }
                />
              </>
            )}
            <NumberField
              label="Update rate (Hz)"
              value={item.updateRate_hz}
              step={1}
              onChange={(updateRate_hz) =>
                updateMode(spec.id, item.id, { updateRate_hz: Math.max(0, updateRate_hz) })
              }
            />
            <p className="text-xs text-zinc-500">
              Update period: {formatPeriod(updatePeriod_s(item.updateRate_hz))}
            </p>
            <SmallButton
              label="Remove mode"
              onClick={() => deleteMode(spec.id, item.id)}
              disabled={spec.modes.length <= 1}
            />
          </div>
        ))}
        <SmallButton label="Add mode" onClick={() => addMode(spec.id)} />
      </section>

      {spec.tof && spec.kind !== 'radar' && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-200">ToF model (approximate)</h3>
          <NumberField
            label="Rays along one side of a zone"
            value={spec.tof.raysPerZoneSide}
            step={1}
            onChange={(raysPerZoneSide) =>
              updateSpec(spec.id, {
                tof: { ...spec.tof!, raysPerZoneSide: Math.max(1, Math.round(raysPerZoneSide)) },
              })
            }
          />
          <NumberField
            label="Minimum zone fill (0 to 1)"
            value={spec.tof.minZoneFill}
            step={0.05}
            onChange={(minZoneFill) =>
              updateSpec(spec.id, {
                tof: { ...spec.tof!, minZoneFill: clamp01(minZoneFill) },
              })
            }
          />
          <NumberField
            label="Reference reflectivity (0 to 1)"
            value={spec.tof.referenceReflectivity}
            step={0.01}
            onChange={(referenceReflectivity) =>
              updateSpec(spec.id, {
                tof: { ...spec.tof!, referenceReflectivity: Math.max(0, referenceReflectivity) },
              })
            }
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-400">
              Measured max range ({lengthUnit}). Leave a row blank to keep the square-root formula.
              A filled row is the indoor range for that material.
            </p>
            {APPROXIMATE_MATERIALS.map((material) => {
              const row = spec.measuredRanges?.find((item) => item.material === material.name)
              const display = row ? lengthToDisplay(row.rangeMax_m, unitSystem) : ''
              return (
                <label key={material.name} className="flex flex-col gap-1 text-xs text-zinc-400">
                  {material.name}
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    step={unitSystem === 'metric' ? 0.01 : 0.1}
                    placeholder="formula"
                    aria-label={`Measured range for ${material.name}`}
                    value={display === '' ? '' : roundInput(display)}
                    onChange={(event) => {
                      const text = event.target.value
                      if (text === '') {
                        setMeasuredRange(spec, material.name, null)
                        return
                      }
                      const next = Number(text)
                      if (Number.isFinite(next)) {
                        setMeasuredRange(spec, material.name, Math.max(0, lengthFromDisplay(next, unitSystem)))
                      }
                    }}
                  />
                </label>
              )
            })}
          </div>
          <NumberField
            label={`Noise base (${lengthUnit})`}
            value={lengthToDisplay(spec.tof.noise.sigmaBase_m, unitSystem)}
            step={0.01}
            onChange={(display) =>
              updateSpec(spec.id, {
                tof: {
                  ...spec.tof!,
                  noise: {
                    ...spec.tof!.noise,
                    sigmaBase_m: Math.max(0, lengthFromDisplay(display, unitSystem)),
                  },
                },
              })
            }
          />
          <NumberField
            label="Noise per meter (m per m)"
            value={spec.tof.noise.sigmaPerMeter}
            step={0.001}
            onChange={(sigmaPerMeter) =>
              updateSpec(spec.id, {
                tof: {
                  ...spec.tof!,
                  noise: { ...spec.tof!.noise, sigmaPerMeter: Math.max(0, sigmaPerMeter) },
                },
              })
            }
          />
        </section>
      )}

      {spec.radar && spec.kind === 'radar' && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-200">Radar model (placeholder)</h3>
          <NumberField
            label="Azimuth resolution (deg)"
            value={spec.radar.azResolution_deg}
            step={1}
            onChange={(azResolution_deg) =>
              updateSpec(spec.id, { radar: { ...spec.radar!, azResolution_deg } })
            }
          />
          <NumberField
            label="Elevation resolution (deg)"
            value={spec.radar.elResolution_deg}
            step={1}
            onChange={(elResolution_deg) =>
              updateSpec(spec.id, { radar: { ...spec.radar!, elResolution_deg } })
            }
          />
          <NumberField
            label={`Range resolution (${lengthUnit})`}
            value={lengthToDisplay(spec.radar.rangeResolution_m, unitSystem)}
            step={0.01}
            onChange={(display) =>
              updateSpec(spec.id, {
                radar: {
                  ...spec.radar!,
                  rangeResolution_m: Math.max(0, lengthFromDisplay(display, unitSystem)),
                },
              })
            }
          />
          <NumberField
            label={`Minimum target size (${lengthUnit})`}
            value={lengthToDisplay(spec.radar.minTargetSize_m, unitSystem)}
            step={0.01}
            onChange={(display) =>
              updateSpec(spec.id, {
                radar: {
                  ...spec.radar!,
                  minTargetSize_m: Math.max(0, lengthFromDisplay(display, unitSystem)),
                },
              })
            }
          />
          <NumberField
            label="Detection probability (0 to 1)"
            value={spec.radar.detectionProbability}
            step={0.05}
            onChange={(detectionProbability) =>
              updateSpec(spec.id, {
                radar: { ...spec.radar!, detectionProbability: clamp01(detectionProbability) },
              })
            }
          />
          <NumberField
            label={`Range noise (${lengthUnit})`}
            value={lengthToDisplay(spec.radar.noise.rangeSigma_m, unitSystem)}
            step={0.01}
            onChange={(display) =>
              updateSpec(spec.id, {
                radar: {
                  ...spec.radar!,
                  noise: {
                    ...spec.radar!.noise,
                    rangeSigma_m: Math.max(0, lengthFromDisplay(display, unitSystem)),
                  },
                },
              })
            }
          />
          <NumberField
            label="Angle noise (deg)"
            value={spec.radar.noise.angleSigma_deg}
            step={0.1}
            onChange={(angleSigma_deg) =>
              updateSpec(spec.id, {
                radar: {
                  ...spec.radar!,
                  noise: { ...spec.radar!.noise, angleSigma_deg: Math.max(0, angleSigma_deg) },
                },
              })
            }
          />
        </section>
      )}

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Notes
        <textarea
          className={inputClass}
          rows={3}
          value={spec.notes}
          onChange={(event) => updateSpec(spec.id, { notes: event.target.value })}
        />
      </label>

      <DerivedReadout spec={spec} horizontal_deg={horizontal} vertical_deg={vertical} />
    </div>
  )
}

function DerivedReadout(props: {
  spec: SensorSpec
  horizontal_deg: number | null
  vertical_deg: number | null
}) {
  const unitSystem = useUiStore((state) => state.unitSystem)
  const mode = activeMode(props.spec)
  const liftSpec = useLiftStore((state) => state.spec)
  const speed_mps = useLiftStore((state) => state.pose.speed_mps)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const reference = props.spec.tof?.referenceReflectivity ?? 0
  const limit_mps = speedLimit_mps(liftSpec, platformHeight_m)
  const brake_mps2 = brakeDecel_mps2(liftSpec, platformHeight_m)

  return (
    <section className="flex flex-col gap-2 text-sm leading-relaxed text-zinc-300">
      <h3 className="text-sm font-medium text-zinc-200">Derived values</h3>
      {props.horizontal_deg === null || props.vertical_deg === null ? (
        <p>Set a positive zone count to see the zone size.</p>
      ) : (
        <>
          <p>
            Angle per zone: {props.horizontal_deg.toFixed(2)}° across, {props.vertical_deg.toFixed(2)}°
            down.
          </p>
          {ZONE_FOOTPRINT_DISTANCES_M.map((distance_m) => (
            <p key={distance_m}>
              Zone at {formatLength(distance_m, unitSystem)}: across{' '}
              {formatLength(zoneFootprint_m(distance_m, props.horizontal_deg!), unitSystem)}, down{' '}
              {formatLength(zoneFootprint_m(distance_m, props.vertical_deg!), unitSystem)}
            </p>
          ))}
        </>
      )}
      {props.spec.kind !== 'radar' && (
        <div className="mt-1 flex flex-col gap-1">
          <p className="text-zinc-400">Effective max range by material (approximate):</p>
          <p>
            Formula, indoor light: rangeMax × √(ρ / ρ_ref), capped at rangeMax. A filled measured
            row replaces it.
          </p>
          {reference <= 0 ? (
            <p>Reference reflectivity must be above zero.</p>
          ) : (
            APPROXIMATE_MATERIALS.map((material) => {
              const formula_m = effectiveMax_m(props.spec.rangeMax_m, material.reflectivity, reference)
              const seeing_m = tofSeeingRange_m(props.spec, material.name, material.reflectivity, 'indoor')
              const measured = props.spec.measuredRanges?.some((row) => row.material === material.name)
              const formulaNote =
                measured && formula_m !== null ? ` (measured; formula would be ${formatLength(formula_m, unitSystem)})` : ''
              return (
                <p key={material.name}>
                  {material.name}: {formatLength(seeing_m, unitSystem)}
                  {formulaNote}
                </p>
              )
            })
          )}
        </div>
      )}
      <div className="mt-1 flex flex-col gap-1">
        <p className="text-zinc-400">
          Preview warning distance at the current speed limit ({formatSpeed(limit_mps, unitSystem)}
          ). This is not the HUD number. It waits {props.spec.framesToConfirm} update periods plus
          the processing latency, then the reaction time and braking.
        </p>
        {props.spec.modes.map((item) => {
          const delay_s = sensorDelay_s(
            item.updateRate_hz,
            props.spec.processingLatency_s,
            props.spec.framesToConfirm,
          )
          const distance_m =
            delay_s === null
              ? null
              : warningDistance_m(limit_mps, liftSpec.operatorReaction_s, brake_mps2, delay_s)
          const active = item.id === props.spec.activeModeId
          return (
            <p key={item.id}>
              {item.name}
              {active ? ' (active)' : ''}: {distance_m === null ? 'set a positive update rate' : formatLength(distance_m, unitSystem)}
              {delay_s !== null ? `, sensor delay ${formatPeriod(delay_s)}` : ''}
            </p>
          )
        })}
        {Math.abs(speed_mps) > 0.01 && mode && (
          <CurrentSpeedPreview
            speed_mps={speed_mps}
            reaction_s={liftSpec.operatorReaction_s}
            brake_mps2={brake_mps2}
            updateRate_hz={mode.updateRate_hz}
            latency_s={props.spec.processingLatency_s}
            framesToConfirm={props.spec.framesToConfirm}
          />
        )}
      </div>
    </section>
  )
}

function CurrentSpeedPreview(props: {
  speed_mps: number
  reaction_s: number
  brake_mps2: number
  updateRate_hz: number
  latency_s: number
  framesToConfirm: number
}) {
  const unitSystem = useUiStore((state) => state.unitSystem)
  const delay_s = sensorDelay_s(props.updateRate_hz, props.latency_s, props.framesToConfirm)
  const distance_m =
    delay_s === null
      ? null
      : warningDistance_m(props.speed_mps, props.reaction_s, props.brake_mps2, delay_s)
  return (
    <p>
      At the current speed, active mode:{' '}
      {distance_m === null ? 'braking rate or update rate is zero' : formatLength(distance_m, unitSystem)}
    </p>
  )
}

function setMeasuredRange(spec: SensorSpec, material: string, rangeMax_m: number | null): void {
  const rest = (spec.measuredRanges ?? []).filter((row) => row.material !== material)
  const measuredRanges = rangeMax_m === null ? rest : [...rest, { material, rangeMax_m }]
  useSensorStore.getState().updateSpec(spec.id, {
    measuredRanges: measuredRanges.length === 0 ? undefined : measuredRanges,
  })
}

function kindPatch(spec: SensorSpec, kind: SensorKind): Partial<SensorSpec> {
  const patch: Partial<SensorSpec> = { kind }
  if (kind !== 'radar' && !spec.tof) {
    patch.tof = {
      raysPerZoneSide: 4,
      minZoneFill: 0.25,
      referenceReflectivity: 0.88,
      noise: { sigmaBase_m: 0.01, sigmaPerMeter: 0.005 },
    }
  }
  if (kind === 'radar' && !spec.radar) {
    patch.radar = {
      azResolution_deg: 5,
      elResolution_deg: 10,
      rangeResolution_m: 0.1,
      minTargetSize_m: 0.2,
      detectionProbability: 0.9,
      noise: { rangeSigma_m: 0.05, angleSigma_deg: 1 },
    }
  }
  return patch
}

function formatPeriod(period_s: number | null): string {
  if (period_s === null) {
    return 'not defined'
  }
  if (period_s < 1) {
    return `${Math.round(period_s * 1000)} ms`
  }
  return `${period_s.toFixed(2)} s`
}

function SmallButton(props: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 hover:bg-zinc-700 disabled:opacity-40"
      onClick={props.onClick}
    >
      {props.label}
    </button>
  )
}

function NumberField(
  props: {
    label: string
    step?: number
    text?: boolean
    value: number | string
    onChange?: (value: number) => void
    onText?: (value: string) => void
  },
) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {props.label}
      {props.text ? (
        <input
          className={inputClass}
          value={String(props.value)}
          onChange={(event) => props.onText?.(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          type="number"
          step={props.step}
          value={roundInput(Number(props.value))}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) {
              props.onChange?.(next)
            }
          }}
        />
      )}
    </label>
  )
}

function roundInput(value: number): number {
  return Math.round(value * 1000) / 1000
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function lengthToDisplay(length_m: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? length_m : metersToInches(length_m)
}

function lengthFromDisplay(displayValue: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? displayValue : inchesToMeters(displayValue)
}
