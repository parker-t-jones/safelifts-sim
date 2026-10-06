/**
 * Plain-language sensor assumptions shown on the Sensors tab.
 * Each entry matches a comment next to the code that implements it.
 */
export interface ModelAssumption {
  title: string
  detail: string
}

export function sensorAssumptions(): ModelAssumption[] {
  return [
    {
      title: 'VL53L8CX numbers',
      detail:
        'Field of view, range, zone grids, update rates, noise, processing latency, and frames to confirm are approximate. They stay marked that way until they are checked against the datasheet.',
    },
    {
      title: 'Resolution modes',
      detail:
        'Each sensor has one or more modes. The active mode chooses the zone grid and the update rate. The VL53L8CX preset includes an 8×8 mode at about 15 Hz and a 4×4 mode at about 60 Hz.',
    },
    {
      title: 'Zone size',
      detail:
        'Each zone is an equal slice of the field of view. Its footprint on a plane at distance d is 2 · d · tan(zone angle / 2). Column 0 is the sensor’s right. Row 0 is down.',
    },
    {
      title: 'Effective max range',
      detail:
        'Returned signal is proportional to ρ / d², so range scales with the square root of the reflectivity ratio, not linearly. effectiveMax(ρ) = rangeMax × √(ρ / ρ_ref), and it never exceeds rangeMax. ρ is the target reflectivity. ρ_ref is the reference reflectivity, and a value of 0 is rejected. The material table is approximate. A measured max-range row on the sensor, when filled in, replaces this formula for that material. That row is the indoor range.',
    },
    {
      title: 'Frames to confirm',
      detail:
        'A reading counts only after this many updates. The default is 2 and it is approximate. The warning-distance preview waits that many update periods of the active mode, then the processing latency.',
    },
    {
      title: 'Warning distance preview',
      detail:
        'The HUD straight-line stopping distance is reaction time and braking only. The preview adds frames-to-confirm update periods and the processing latency before that reaction time, then the same braking term. A faster mode or fewer confirm frames shortens it. It is not on the HUD yet. A module uses the slowest sensor in it.',
    },
    {
      title: 'Radar',
      detail:
        'The radar template is a placeholder. Material is ignored for radar in this version. Its ranging model is not running yet.',
    },
  ]
}
