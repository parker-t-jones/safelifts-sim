/**
 * Warning-distance preview for one module template.
 * Uses the slowest sensor in the housing, at the lift's current speed limit.
 * This is not the HUD straight-line stop.
 */
import { brakeDecel_mps2, speedLimit_mps, warningDistance_m } from '../lift/kinematics'
import { moduleSensorTimings, slowestTimings } from '../modules/warning'
import type { SensorModule } from '../modules/types'
import { useLiftStore } from '../state/liftStore'
import { useSensorStore } from '../state/sensorStore'
import { useUiStore } from '../state/uiStore'
import { formatLength, formatSpeed } from '../units/format'

export function ModuleWarning(props: { module: SensorModule }) {
  const specs = useSensorStore((state) => state.specs)
  const unitSystem = useUiStore((state) => state.unitSystem)
  const liftSpec = useLiftStore((state) => state.spec)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const speed_mps = useLiftStore((state) => state.pose.speed_mps)
  const timings = moduleSensorTimings(props.module, specs)
  const slowest = slowestTimings(timings)
  const limit_mps = speedLimit_mps(liftSpec, platformHeight_m)
  const brake_mps2 = brakeDecel_mps2(liftSpec, platformHeight_m)
  const delay_s = slowest[0]?.delay_s ?? null
  const distance_m =
    delay_s === null ? null : warningDistance_m(limit_mps, liftSpec.operatorReaction_s, brake_mps2, delay_s)
  const moving_m =
    delay_s === null || Math.abs(speed_mps) <= 0.01
      ? null
      : warningDistance_m(speed_mps, liftSpec.operatorReaction_s, brake_mps2, delay_s)

  return (
    <div className="flex flex-col gap-1 text-sm leading-relaxed text-zinc-300">
      <p className="text-zinc-400">
        Warning distance at the current speed limit ({formatSpeed(limit_mps, unitSystem)}), using the
        slowest sensor. This is not the HUD number.
      </p>
      {timings.length === 0 ? (
        <p>Add a sensor to see a warning distance.</p>
      ) : slowest.length === 0 || delay_s === null ? (
        <p>Set a positive update rate on a sensor in this module.</p>
      ) : (
        <>
          <p>
            {slowest.length === timings.length
              ? `All ${timings.length} sensors share this delay`
              : `Slowest: ${slowest.map((item) => item.sensorName).join(', ')}`}{' '}
            ({formatDelay(delay_s)}). {slowest[0].specName}, mode {slowest[0].modeName}.
          </p>
          <p>
            {distance_m === null ? 'Braking rate is zero.' : formatLength(distance_m, unitSystem)}
            {moving_m !== null ? ` At the current speed: ${formatLength(moving_m, unitSystem)}.` : ''}
          </p>
        </>
      )}
    </div>
  )
}

function formatDelay(delay_s: number): string {
  if (delay_s < 1) {
    return `${Math.round(delay_s * 1000)} ms`
  }
  return `${delay_s.toFixed(2)} s`
}
