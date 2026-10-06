/**
 * How far the danger shell reaches.
 * The typed distance stays put. The shell used for sampling grows when
 * the worst-case warning distance plus a quarter meter is longer.
 */
import { brakeDecel_mps2, speedLimit_mps, warningDistance_m } from '../lift/kinematics'
import type { LiftSpec } from '../lift/types'
import { activeMode, sensorDelay_s } from '../sensors/derived'
import type { SensorSpec } from '../sensors/types'
import type { SensorModule } from '../modules/types'
import type { ModulePlacement } from '../placement/types'
import { SHELL_PAST_WARNING_M } from './types'

export interface WarningSource {
  /** Null when the brake rate is zero while the speed limit is not. */
  warningDistance_m: number | null
  /** Slowest enabled sensor. Null when no enabled sensor has an update rate. */
  label: string | null
  delay_s: number
}

/**
 * The shell actually sampled. Never shorter than the warning distance
 * plus SHELL_PAST_WARNING_M, so an in-time band can exist outside the stop.
 */
export function effectiveEnvelope_m(requested_m: number, warning_m: number | null): number {
  const requested = Math.max(0, requested_m)
  if (warning_m === null || !Number.isFinite(warning_m)) {
    return requested
  }
  return Math.max(requested, warning_m + SHELL_PAST_WARNING_M)
}

export function shellWasExpanded(requested_m: number, warning_m: number | null): boolean {
  return effectiveEnvelope_m(requested_m, warning_m) > Math.max(0, requested_m) + 1e-9
}

/**
 * Worst case at one platform height: the speed limit and brake rate for
 * that height, plus the longest frames-to-confirm delay among enabled sensors.
 * A disabled placement is left out. A sensor with no update rate is left out.
 * With no such sensor, the delay is zero and the distance is reaction plus braking.
 */
export function warningAtHeight(
  spec: LiftSpec,
  platformHeight_m: number,
  modules: readonly SensorModule[],
  placements: readonly ModulePlacement[],
  sensorSpecs: readonly SensorSpec[],
): WarningSource {
  let longest_s = 0
  let label: string | null = null
  let foundSensor = false

  for (const placement of placements) {
    if (!placement.enabled) {
      continue
    }
    const module = modules.find((item) => item.id === placement.moduleId)
    if (!module) {
      continue
    }
    for (const sensor of module.sensors) {
      const sensorSpec = sensorSpecs.find((item) => item.id === sensor.sensorSpecId)
      const mode = sensorSpec ? activeMode(sensorSpec) : null
      if (!sensorSpec || !mode) {
        continue
      }
      const delay_s = sensorDelay_s(mode.updateRate_hz, sensorSpec.processingLatency_s, sensorSpec.framesToConfirm)
      if (delay_s === null) {
        continue
      }
      foundSensor = true
      if (delay_s >= longest_s) {
        longest_s = delay_s
        label = `${sensor.name} (${sensorSpec.name}, ${mode.name})`
      }
    }
  }

  const speed_mps = speedLimit_mps(spec, platformHeight_m)
  const brake_mps2 = brakeDecel_mps2(spec, platformHeight_m)
  return {
    warningDistance_m: warningDistance_m(speed_mps, spec.operatorReaction_s, brake_mps2, longest_s),
    label: foundSensor ? label : null,
    delay_s: longest_s,
  }
}
