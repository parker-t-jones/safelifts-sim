/**
 * Sensor library data. A SensorSpec describes one sensor model.
 * Update rate lives on each resolution mode, so a VL53L8CX can carry
 * both 4×4 and 8×8 without becoming two unrelated sensors.
 * Only these objects are meant to be saved later.
 */

export type SensorKind = 'tof-multizone' | 'tof-single' | 'radar'

export interface ResolutionMode {
  id: string
  /** Shown in the form, for example "8×8". */
  name: string
  /** Zone columns. Radar ignores these and uses its angle resolution instead. */
  zonesX: number
  /** Zone rows. */
  zonesY: number
  updateRate_hz: number
}

export interface SensorSpec {
  id: string
  name: string
  kind: SensorKind
  /** Horizontal field of view. Stored in degrees, like the form. */
  fovH_deg: number
  /** Vertical field of view, in degrees. */
  fovV_deg: number
  rangeMin_m: number
  /** Max range on the reference target. */
  rangeMax_m: number
  /** Which mode supplies the zone grid and the update rate. */
  activeModeId: string
  modes: ResolutionMode[]
  /**
   * Time after a measurement before the reading can be used.
   * Approximate until a datasheet confirms it.
   */
  processingLatency_s: number
  /**
   * How many updates must agree before a reading counts.
   * Approximate until a datasheet confirms it. Default 2.
   * The warning-distance preview waits this many update periods,
   * then processing latency, then operator reaction time, then braking.
   */
  framesToConfirm: number
  notes: string
  /**
   * True for the VL53L8CX presets until the numbers are checked
   * against the datasheet. The form says so.
   */
  approximate: boolean

  tof?: {
    /** Sub-rays along one side of a zone. 4 means 16 rays in the zone. */
    raysPerZoneSide: number
    /** Fraction of a zone's rays that must hit before the zone is valid. */
    minZoneFill: number
    /** Reflectivity at which rangeMax_m applies. 0 is rejected by effectiveMax. */
    referenceReflectivity: number
    noise: { sigmaBase_m: number; sigmaPerMeter: number }
  }

  radar?: {
    azResolution_deg: number
    elResolution_deg: number
    rangeResolution_m: number
    minTargetSize_m: number
    /** Chance of reporting a detectable target on one update. */
    detectionProbability: number
    noise: { rangeSigma_m: number; angleSigma_deg: number }
  }
}
