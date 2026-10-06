/**
 * Built-in sensor specs. Every VL53L8CX number is approximate and is
 * labeled that way in the Sensors tab until it is checked against the datasheet.
 * The radar entry is an obvious placeholder.
 */
import type { SensorSpec } from './types'

export const VL53L8CX_SPEC: SensorSpec = {
  id: 'vl53l8cx',
  name: 'VL53L8CX',
  kind: 'tof-multizone',
  // Spec placeholders, not confirmed on the datasheet.
  fovH_deg: 45,
  fovV_deg: 45,
  rangeMin_m: 0.02,
  rangeMax_m: 4,
  activeModeId: 'vl53-8x8',
  modes: [
    { id: 'vl53-8x8', name: '8×8', zonesX: 8, zonesY: 8, updateRate_hz: 15 },
    { id: 'vl53-4x4', name: '4×4', zonesX: 4, zonesY: 4, updateRate_hz: 60 },
  ],
  // Not from the datasheet. A short host-side delay after the ranging period.
  processingLatency_s: 0.02,
  // Not from the datasheet. Two agreeing frames before a reading counts.
  framesToConfirm: 2,
  notes: 'Approximate. Confirm every number against the VL53L8CX datasheet.',
  approximate: true,
  tof: {
    raysPerZoneSide: 4,
    minZoneFill: 0.25,
    // Example white-target reflectivity from the spec. Still approximate.
    referenceReflectivity: 0.88,
    noise: { sigmaBase_m: 0.01, sigmaPerMeter: 0.005 },
  },
}

export const GENERIC_RADAR_SPEC: SensorSpec = {
  id: 'generic-radar',
  name: 'Generic radar (template)',
  kind: 'radar',
  fovH_deg: 120,
  fovV_deg: 30,
  rangeMin_m: 0.2,
  rangeMax_m: 20,
  activeModeId: 'radar-default',
  modes: [{ id: 'radar-default', name: 'Default', zonesX: 1, zonesY: 1, updateRate_hz: 10 }],
  processingLatency_s: 0.05,
  framesToConfirm: 2,
  notes: 'Placeholder. Replace every field with your radar’s datasheet values.',
  approximate: true,
  radar: {
    azResolution_deg: 5,
    elResolution_deg: 10,
    rangeResolution_m: 0.1,
    minTargetSize_m: 0.2,
    detectionProbability: 0.9,
    noise: { rangeSigma_m: 0.05, angleSigma_deg: 1 },
  },
}

export const SENSOR_PRESETS: SensorSpec[] = [VL53L8CX_SPEC, GENERIC_RADAR_SPEC]

export function newSensorId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${random}`
}

/** A fresh multizone ToF with one editable mode. Numbers are approximate. */
export function blankTofSpec(): SensorSpec {
  const modeId = newSensorId('mode')
  return {
    id: newSensorId('sensor'),
    name: 'New ToF sensor',
    kind: 'tof-multizone',
    fovH_deg: 45,
    fovV_deg: 45,
    rangeMin_m: 0.02,
    rangeMax_m: 4,
    activeModeId: modeId,
    modes: [{ id: modeId, name: '8×8', zonesX: 8, zonesY: 8, updateRate_hz: 15 }],
    processingLatency_s: 0.02,
    framesToConfirm: 2,
    notes: 'Approximate. Replace these with datasheet values.',
    approximate: true,
    tof: {
      raysPerZoneSide: 4,
      minZoneFill: 0.25,
      referenceReflectivity: 0.88,
      noise: { sigmaBase_m: 0.01, sigmaPerMeter: 0.005 },
    },
  }
}

/** A fresh radar template. Every number is a placeholder. */
export function blankRadarSpec(): SensorSpec {
  const modeId = newSensorId('mode')
  return {
    id: newSensorId('sensor'),
    name: 'New radar',
    kind: 'radar',
    fovH_deg: 90,
    fovV_deg: 30,
    rangeMin_m: 0.2,
    rangeMax_m: 10,
    activeModeId: modeId,
    modes: [{ id: modeId, name: 'Default', zonesX: 1, zonesY: 1, updateRate_hz: 10 }],
    processingLatency_s: 0.05,
    framesToConfirm: 2,
    notes: 'Placeholder. Enter the datasheet values.',
    approximate: true,
    radar: {
      azResolution_deg: 5,
      elResolution_deg: 10,
      rangeResolution_m: 0.1,
      minTargetSize_m: 0.2,
      detectionProbability: 0.9,
      noise: { rangeSigma_m: 0.05, angleSigma_deg: 1 },
    },
  }
}
