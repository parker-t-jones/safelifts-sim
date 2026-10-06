/**
 * Lift tab: edit every LiftSpec field, the live platform height, and
 * whether snap-point markers are drawn. Every number is marked approximate.
 */
import { liftAssumptions } from '../lift/assumptions'
import { clamp, turnEnvelope_m, type TurnEnvelope } from '../lift/kinematics'
import type { TurnMeasure } from '../lift/types'
import { useLiftStore } from '../state/liftStore'
import { useUiStore } from '../state/uiStore'
import { degreesToRadians, feetToMeters, inchesToMeters, metersToFeet, metersToInches } from '../units/convert'
import { formatLength } from '../units/format'

const LENGTH_FIELDS: Array<{ key: LengthKey; label: string }> = [
  { key: 'chassisLength_m', label: 'Chassis length' },
  { key: 'chassisWidth_m', label: 'Chassis width' },
  { key: 'trackWidth_m', label: 'Track width' },
  { key: 'chassisHeight_m', label: 'Chassis height' },
  { key: 'wheelbase_m', label: 'Wheelbase' },
  { key: 'platformLength_m', label: 'Platform length' },
  { key: 'platformWidth_m', label: 'Platform width' },
  { key: 'extensionDeckLength_m', label: 'Extension deck length' },
  { key: 'guardrailHeight_m', label: 'Guardrail height' },
  { key: 'platformHeightMin_m', label: 'Stowed platform height' },
  { key: 'platformHeightMax_m', label: 'Max platform height' },
  { key: 'elevatedThreshold_m', label: 'Elevated-speed height' },
]

const SPEED_FIELDS: Array<{ key: SpeedKey; label: string }> = [
  { key: 'driveSpeedStowed_mps', label: 'Stowed drive speed' },
  { key: 'driveSpeedElevated_mps', label: 'Elevated drive speed' },
  { key: 'liftSpeed_mps', label: 'Platform raise/lower speed' },
]

type LengthKey =
  | 'chassisLength_m'
  | 'chassisWidth_m'
  | 'trackWidth_m'
  | 'chassisHeight_m'
  | 'wheelbase_m'
  | 'platformLength_m'
  | 'platformWidth_m'
  | 'extensionDeckLength_m'
  | 'guardrailHeight_m'
  | 'platformHeightMin_m'
  | 'platformHeightMax_m'
  | 'elevatedThreshold_m'

type SpeedKey = 'driveSpeedStowed_mps' | 'driveSpeedElevated_mps' | 'liftSpeed_mps'

const TURN_MEASURES: Array<{ id: TurnMeasure; label: string }> = [
  { id: 'wheels', label: 'Wheels' },
  { id: 'chassis', label: 'Chassis edge' },
  { id: 'body', label: 'Full body with the deck' },
]

export function LiftPanel() {
  const spec = useLiftStore((state) => state.spec)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const steer_rad = useLiftStore((state) => state.pose.steer_rad)
  const showSnapPoints = useLiftStore((state) => state.showSnapPoints)
  const updateSpec = useLiftStore((state) => state.updateSpec)
  const setPlatformHeight = useLiftStore((state) => state.setPlatformHeight)
  const setShowSnapPoints = useLiftStore((state) => state.setShowSnapPoints)
  const resetApproximatePreset = useLiftStore((state) => state.resetApproximatePreset)
  const unitSystem = useUiStore((state) => state.unitSystem)
  const lengthUnit = unitSystem === 'metric' ? 'm' : 'in'
  const speedUnit = unitSystem === 'metric' ? 'm/s' : 'ft/s'
  const accelUnit = unitSystem === 'metric' ? 'm/s²' : 'ft/s²'
  const maxSteer_rad = degreesToRadians(spec.maxSteerAngle_deg)
  const comparedAtMax = turnEnvelope_m(spec, maxSteer_rad, spec.turnCompareMeasure)
  const comparedNow = turnEnvelope_m(spec, steer_rad, spec.turnCompareMeasure)
  const envelopeAtMax = turnEnvelope_m(spec, maxSteer_rad, 'body')
  const envelopeNow = turnEnvelope_m(spec, steer_rad, 'body')
  const measureLabel =
    TURN_MEASURES.find((item) => item.id === spec.turnCompareMeasure)?.label ?? 'Wheels'
  const heightLo = Math.min(spec.platformHeightMin_m, spec.platformHeightMax_m)
  const heightHi = Math.max(spec.platformHeightMin_m, spec.platformHeightMax_m)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Lift</h2>
        <p className="mt-1 text-sm leading-relaxed text-amber-200/90">
          Every value is approximate. Replace them with the lift’s spec sheet when you have it.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Name (approximate class)
        <input
          className={inputClass}
          value={spec.name}
          onChange={(event) => updateSpec({ name: event.target.value })}
        />
      </label>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Platform height</h3>
        <input
          type="range"
          min={heightLo}
          max={heightHi}
          step={0.01}
          value={clamp(platformHeight_m, heightLo, heightHi)}
          aria-label="Platform height"
          onChange={(event) => setPlatformHeight(Number(event.target.value))}
        />
        <p className="text-sm text-zinc-300">{formatLength(platformHeight_m, unitSystem)}</p>
        <p className="text-xs leading-relaxed text-zinc-500">
          R raises and F lowers. W/S drive, A/D steer, Space brakes to a stop. Those drive keys
          respond immediately unless control latency is above zero.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Size ({lengthUnit}, approximate)</h3>
        {LENGTH_FIELDS.map((field) => (
          <NumberField
            key={field.key}
            label={`${field.label} (${lengthUnit})`}
            value={lengthToDisplay(spec[field.key], unitSystem)}
            step={unitSystem === 'metric' ? 0.01 : 0.1}
            onChange={(displayValue) => {
              const meters = lengthFromDisplay(displayValue, unitSystem)
              updateSpec({
                [field.key]: field.key === 'trackWidth_m' ? Math.max(0, meters) : meters,
              })
            }}
          />
        ))}
        <p className="text-xs leading-relaxed text-zinc-500">
          Track width is the distance between the left and right wheel centers. It starts slightly
          narrower than the chassis. The drawn wheels and the Wheels turning-radius measurement
          both use it.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Motion (approximate)</h3>
        {SPEED_FIELDS.map((field) => (
          <NumberField
            key={field.key}
            label={`${field.label} (${speedUnit})`}
            value={speedToDisplay(spec[field.key], unitSystem)}
            step={0.05}
            onChange={(displayValue) =>
              updateSpec({ [field.key]: speedFromDisplay(displayValue, unitSystem) })
            }
          />
        ))}
        <NumberField
          label="Max steer angle (deg)"
          value={spec.maxSteerAngle_deg}
          step={1}
          onChange={(degrees) => updateSpec({ maxSteerAngle_deg: degrees })}
        />
        <NumberField
          label={`Drive acceleration (${accelUnit})`}
          value={speedToDisplay(spec.accel_mps2, unitSystem)}
          step={0.05}
          onChange={(displayValue) =>
            updateSpec({ accel_mps2: Math.max(0, speedFromDisplay(displayValue, unitSystem)) })
          }
        />
        <NumberField
          label={`Braking deceleration, stowed (${accelUnit})`}
          value={speedToDisplay(spec.brakeDecelStowed_mps2, unitSystem)}
          step={0.05}
          onChange={(displayValue) =>
            updateSpec({
              brakeDecelStowed_mps2: Math.max(0, speedFromDisplay(displayValue, unitSystem)),
            })
          }
        />
        <NumberField
          label={`Braking deceleration, elevated (${accelUnit})`}
          value={speedToDisplay(spec.brakeDecelElevated_mps2, unitSystem)}
          step={0.05}
          onChange={(displayValue) =>
            updateSpec({
              brakeDecelElevated_mps2: Math.max(0, speedFromDisplay(displayValue, unitSystem)),
            })
          }
        />
        <NumberField
          label="Control latency (s)"
          value={spec.controlLatency_s}
          step={0.05}
          onChange={(seconds) => updateSpec({ controlLatency_s: Math.max(0, seconds) })}
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          Machine delay before W, A, S, D, and Space take effect. Leave this at 0 for an immediate
          response.
        </p>
        <NumberField
          label="Operator reaction time (s)"
          value={spec.operatorReaction_s}
          step={0.05}
          onChange={(seconds) => updateSpec({ operatorReaction_s: Math.max(0, seconds) })}
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          The HUD straight-line stopping distance uses this with the current speed and braking rate. Driving
          keys do not wait for it. When alerts exist, an optional auto-brake can wait this long
          after an alert.
        </p>
        <OptionalNumberField
          label={`Max drive height (${lengthUnit}), optional`}
          hint="Leave blank to allow driving at every height. Above this, the throttle is ignored."
          value={
            spec.maxDriveHeight_m === null
              ? null
              : lengthToDisplay(spec.maxDriveHeight_m, unitSystem)
          }
          step={unitSystem === 'metric' ? 0.01 : 0.1}
          onChange={(displayValue) =>
            updateSpec({
              maxDriveHeight_m:
                displayValue === null ? null : lengthFromDisplay(displayValue, unitSystem),
            })
          }
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Turning radius (approximate)</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Choose the points the spec sheet measured. The full swept envelope stays listed below
          either way. These numbers do not change the turn.
        </p>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Spec-sheet measurement
          <select
            className={inputClass}
            value={spec.turnCompareMeasure}
            onChange={(event) => {
              const next = event.target.value
              if (isTurnMeasure(next)) {
                updateSpec({ turnCompareMeasure: next })
              }
            }}
          >
            {TURN_MEASURES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <RadiusReadout
          title={`Compared at max steer (${measureLabel})`}
          envelope={comparedAtMax}
          unitSystem={unitSystem}
          insideSpec_m={spec.specInsideTurnRadius_m}
          outsideSpec_m={spec.specOutsideTurnRadius_m}
        />
        <RadiusReadout
          title={`Full swept envelope at max steer`}
          envelope={envelopeAtMax}
          unitSystem={unitSystem}
        />
        {comparedNow === null ? (
          <p className="text-sm text-zinc-400">Current path is straight.</p>
        ) : (
          <p className="text-sm text-zinc-400">
            At the current steer, {measureLabel.toLowerCase()} inside{' '}
            {formatLength(comparedNow.inside_m, unitSystem)}, outside{' '}
            {formatLength(comparedNow.outside_m, unitSystem)}.
            {envelopeNow !== null && spec.turnCompareMeasure !== 'body' && (
              <>
                {' '}
                Full envelope inside {formatLength(envelopeNow.inside_m, unitSystem)}, outside{' '}
                {formatLength(envelopeNow.outside_m, unitSystem)}.
              </>
            )}
          </p>
        )}
        <OptionalNumberField
          label={`Spec-sheet inside radius (${lengthUnit}), optional`}
          hint="Leave blank until you have the sheet."
          value={
            spec.specInsideTurnRadius_m === null
              ? null
              : lengthToDisplay(spec.specInsideTurnRadius_m, unitSystem)
          }
          step={unitSystem === 'metric' ? 0.01 : 0.1}
          onChange={(displayValue) =>
            updateSpec({
              specInsideTurnRadius_m:
                displayValue === null ? null : Math.max(0, lengthFromDisplay(displayValue, unitSystem)),
            })
          }
        />
        <OptionalNumberField
          label={`Spec-sheet outside radius (${lengthUnit}), optional`}
          hint="Leave blank until you have the sheet."
          value={
            spec.specOutsideTurnRadius_m === null
              ? null
              : lengthToDisplay(spec.specOutsideTurnRadius_m, unitSystem)
          }
          step={unitSystem === 'metric' ? 0.01 : 0.1}
          onChange={(displayValue) =>
            updateSpec({
              specOutsideTurnRadius_m:
                displayValue === null ? null : Math.max(0, lengthFromDisplay(displayValue, unitSystem)),
            })
          }
        />
      </section>

      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          checked={showSnapPoints}
          onChange={(event) => setShowSnapPoints(event.target.checked)}
        />
        Show snap points
      </label>

      <button
        type="button"
        className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
        onClick={resetApproximatePreset}
      >
        Reset approximate preset
      </button>

      <details className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Model assumptions</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {liftAssumptions().map((item) => (
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

function RadiusReadout(props: {
  title: string
  envelope: TurnEnvelope | null
  unitSystem: 'imperial' | 'metric'
  insideSpec_m?: number | null
  outsideSpec_m?: number | null
}) {
  if (props.envelope === null) {
    return <p className="text-sm text-zinc-300">{props.title}: the path is straight.</p>
  }
  return (
    <div className="text-sm leading-relaxed text-zinc-300">
      <p>
        {props.title}: inside {formatLength(props.envelope.inside_m, props.unitSystem)}, outside{' '}
        {formatLength(props.envelope.outside_m, props.unitSystem)}
      </p>
      {props.insideSpec_m !== undefined && (
        <ComparisonLine
          name="inside"
          simulated_m={props.envelope.inside_m}
          spec_m={props.insideSpec_m}
          unitSystem={props.unitSystem}
        />
      )}
      {props.outsideSpec_m !== undefined && (
        <ComparisonLine
          name="outside"
          simulated_m={props.envelope.outside_m}
          spec_m={props.outsideSpec_m}
          unitSystem={props.unitSystem}
        />
      )}
    </div>
  )
}

function isTurnMeasure(value: string): value is TurnMeasure {
  return value === 'wheels' || value === 'chassis' || value === 'body'
}

function ComparisonLine(props: {
  name: string
  simulated_m: number
  spec_m: number | null
  unitSystem: 'imperial' | 'metric'
}) {
  if (props.spec_m === null) {
    return null
  }
  const delta_m = props.simulated_m - props.spec_m
  if (Math.abs(delta_m) < 0.0005) {
    return <p>Simulated {props.name} matches the spec sheet.</p>
  }
  const word = delta_m > 0 ? 'larger' : 'smaller'
  return (
    <p>
      Simulated {props.name} is {formatLength(Math.abs(delta_m), props.unitSystem)} {word} than the
      spec sheet.
    </p>
  )
}

function OptionalNumberField(props: {
  label: string
  hint: string
  value: number | null
  step: number
  onChange: (value: number | null) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {props.label}
      <input
        className={inputClass}
        type="number"
        step={props.step}
        placeholder="none"
        value={props.value === null || !Number.isFinite(props.value) ? '' : roundInput(props.value)}
        onChange={(event) => {
          const text = event.target.value.trim()
          if (text === '') {
            props.onChange(null)
            return
          }
          const next = Number(text)
          if (Number.isFinite(next)) {
            props.onChange(next)
          }
        }}
      />
      <span className="leading-relaxed text-zinc-500">{props.hint}</span>
    </label>
  )
}

function NumberField(props: {
  label: string
  value: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {props.label}
      <input
        className={inputClass}
        type="number"
        step={props.step}
        value={Number.isFinite(props.value) ? roundInput(props.value) : 0}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) {
            props.onChange(next)
          }
        }}
      />
    </label>
  )
}

const inputClass =
  'rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500'

function roundInput(value: number): number {
  return Math.round(value * 1000) / 1000
}

function lengthToDisplay(length_m: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? length_m : metersToInches(length_m)
}

function lengthFromDisplay(displayValue: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? displayValue : inchesToMeters(displayValue)
}

function speedToDisplay(speed_mps: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? speed_mps : metersToFeet(speed_mps)
}

function speedFromDisplay(displayValue: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? displayValue : feetToMeters(displayValue)
}
