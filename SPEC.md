# SafeLifts Simulator — Specification

A browser-based 3D simulator of a construction site for testing a scissor-lift collision-prevention system. The user drives a scissor lift by hand through a site, configures sensors (ToF, radar, or anything describable by parameters), places them on the lift, and sees coverage, live sensor readings, detection alerts, and laser guideline projections.

Two audiences, one app:
- **Engineering analysis:** honest, documented sensor models; coverage metrics; logs of missed detections.
- **Funding demos:** clean visuals, smooth manual driving, shareable by URL.

---

## 1. Goals and non-goals

### Goals (in priority order)
1. **Sensor coverage:** define any sensor by its parameters, group sensors into modules, place modules anywhere on the lift, and see exactly what is covered and where the blind spots are, at any platform height.
2. **Live sensing and alerts:** drive the lift through a site; see what each sensor measures in real time and when detection alerts fire. Log every case where an obstacle got dangerously close without being detected.
3. **Laser guidelines:** visualize the front-corner laser lines and compare them with the lift's true path, especially through door frames.
4. **Notes and comparison:** save configurations with screenshots, metrics, and written notes on strengths and weaknesses; compare them side by side.
5. **Demo quality:** looks good, runs smoothly, shareable via a link.

### Non-goals (for now)
- False-alarm analysis.
- Buzzer vs. haptic wristband comparison and operator reaction modeling.
- Laser tolerance or variance modeling (lasers are treated as exact geometry).
- Photorealism.

---

## 2. Tech stack

| Purpose | Choice |
|---|---|
| Language | TypeScript (strict mode) |
| Build / dev server | Vite |
| UI framework | React |
| 3D | three.js via `@react-three/fiber`, helpers from `@react-three/drei` |
| Fast ray casting | `three-mesh-bvh` |
| App state | `zustand` |
| Styling | Tailwind CSS |
| Unit tests | Vitest |
| Heavy computation | Web Worker (coverage analysis) |
| Hosting | GitHub Pages or Vercel (static site) |

Add dependencies only when a milestone needs them.

---

## 3. Conventions

### Units
- **Internally: meters, radians, seconds.** Always.
- **Display:** user toggle between imperial (default: feet/inches) and metric. Conversion happens only in the UI layer (`src/units/`).
- Sensor parameter forms accept degrees for angles and convert on input.

### Coordinate frames
- **World frame:** three.js default. +Y is up. The floor is the plane Y = 0.
- **Lift frame:** origin at the center of the chassis footprint on the floor. **+X = lift forward (the steering end)**, +Y = up, +Z = lift's right (right-handed).
- **Platform frame:** same orientation as the lift frame, origin at the center of the platform floor. Moves up and down with platform height.
- **Sensor frame:** the sensor looks along its local **+X**. Its field of view is centered on +X. Local +Y is the sensor's "up".
- Mount orientation is given as **yaw, pitch, roll** in degrees (applied in that order; yaw about +Y, pitch about the resulting +Z, roll about the resulting +X). Positive pitch tilts the view upward; negative pitch tilts toward the ground.

---

## 4. Data model

All configuration is plain JSON-serializable data. TypeScript types live in `src/*/types.ts`.

### 4.1 Sensor specification (the "sensor library")

```ts
type SensorKind = 'tof-multizone' | 'tof-single' | 'radar';

interface SensorSpec {
  id: string;
  name: string;               // e.g. "VL53L8CX (8x8)"
  kind: SensorKind;
  fovH_deg: number;           // horizontal field of view
  fovV_deg: number;           // vertical field of view
  rangeMin_m: number;
  rangeMax_m: number;         // max range on the reference target (see reflectivity)
  updateRate_hz: number;
  notes?: string;

  tof?: {
    zonesX: number;           // 8 for 8x8, 4 for 4x4, 1 for single-zone
    zonesY: number;
    raysPerZoneSide: number;  // sub-rays per zone side for simulation (default 4 -> 16 rays/zone)
    minZoneFill: number;      // 0..1, fraction of a zone's rays that must hit for a valid reading (default 0.25)
    referenceReflectivity: number; // reflectivity at which rangeMax_m applies (e.g. 0.88 for white)
    noise: { sigmaBase_m: number; sigmaPerMeter: number }; // std dev = base + perMeter * distance
  };

  radar?: {
    azResolution_deg: number;
    elResolution_deg: number;
    rangeResolution_m: number;
    minTargetSize_m: number;  // smallest object reliably detected at mid-range
    detectionProbability: number; // 0..1 per update
    noise: { rangeSigma_m: number; angleSigma_deg: number };
  };
}
```

**Built-in presets** (editable copies; values must be labeled "verify against datasheet" in the UI):
- **VL53L8CX 8×8:** kind `tof-multizone`, FoV 45° × 45°, range 0.02–4.0 m (on high-reflectivity target), 15 Hz, 8×8 zones.
- **VL53L8CX 4×4:** same, 4×4 zones, 60 Hz.
- **Generic radar (template):** kind `radar`, all fields filled with obviously-placeholder example values and a note telling the user to enter their radar's datasheet values.

The user can create, duplicate, edit, and delete sensor specs. Editing a spec immediately updates every sensor using it, including coverage.

### 4.2 Sensor module

A module is a physical housing holding one or more sensors at fixed relative poses (e.g., the team's 6-sensor 3D-printed cluster).

```ts
interface ModuleSensor {
  sensorSpecId: string;
  position_m: [number, number, number];   // in module frame
  yawPitchRoll_deg: [number, number, number];
}

interface SensorModule {
  id: string;
  name: string;
  housingSize_m: [number, number, number]; // simple box for visualization and self-occlusion
  sensors: ModuleSensor[];
}
```

**Built-in module presets:**
- **Single sensor:** one sensor, facing forward.
- **6× cluster (2 rows × 3):** top row at pitch 0°, bottom row at pitch −45°; in each row the sensors are at yaw −45°, 0°, +45°. The angles are editable so the user can match the CAD exactly.

### 4.3 Placement on the lift

```ts
type AttachTarget = 'chassis' | 'platform';

interface ModulePlacement {
  id: string;
  moduleId: string;
  attachTo: AttachTarget;    // 'platform' rides up and down with the platform
  position_m: [number, number, number]; // in lift frame (chassis) or platform frame (platform)
  yawPitchRoll_deg: [number, number, number];
  enabled: boolean;
}
```

**Attach-point snapping:** the lift model exposes named snap points: the four chassis corners, chassis front/rear/side midpoints, the four platform guardrail corners, and guardrail midpoints. The user can snap to these or place freely.

### 4.4 Lift model

```ts
interface LiftSpec {
  name: string;
  chassisLength_m: number;
  chassisWidth_m: number;
  chassisHeight_m: number;       // top of chassis above floor
  wheelbase_m: number;
  platformLength_m: number;
  platformWidth_m: number;
  extensionDeckLength_m: number; // slide-out deck at the front; 0 to disable
  guardrailHeight_m: number;     // above platform floor
  platformHeightMin_m: number;   // stowed platform floor height
  platformHeightMax_m: number;
  driveSpeedStowed_mps: number;
  driveSpeedElevated_mps: number; // applies above a height threshold
  elevatedThreshold_m: number;
  maxSteerAngle_deg: number;
  liftSpeed_mps: number;          // platform raise/lower speed
}
```

**Default preset: "32-in slab scissor, 19-ft class."** Every value must be marked as approximate and editable:
- Chassis 0.81 m wide (32 in), about 1.83 m long, wheelbase about 1.4 m.
- Platform max height about 5.8 m (19 ft); guardrails about 1.1 m.
- Drive speed stowed about 0.9 m/s; elevated about 0.2 m/s.

The model is visual geometry plus a simplified collision mesh: chassis box, scissor stack (animated X-links), platform, guardrails, extension deck.

### 4.5 Site / scene

```ts
type ObstacleType =
  'wall' | 'column' | 'beam' | 'duct' | 'pipe' | 'conduit' | 'cableTray' |
  'sprinklerPipe' | 'doorFrame' | 'pallet' | 'cart' | 'person' | 'scaffold' |
  'stud' | 'importedMesh';

interface Obstacle {
  id: string;
  type: ObstacleType;
  position_m: [number, number, number];
  yawPitchRoll_deg: [number, number, number];
  dimensions_m: Record<string, number>; // type-specific (e.g. pipe: length, diameter)
  reflectivity: number;  // 0..1 for ToF (default by type: drywall 0.8, raw steel 0.5, black pipe 0.05, etc.)
  material: 'drywall' | 'concrete' | 'steel' | 'wood' | 'plastic' | 'fabric' | 'glass' | 'other';
  label?: string;
}

interface SiteScene {
  id: string;
  name: string;
  phase: 'structure' | 'mepRoughIn' | 'framingDrywall' | 'finishes' | 'custom';
  floorSize_m: [number, number];
  ceilingHeight_m: number | null;
  seed: number;          // for procedural generation
  obstacles: Obstacle[];
}
```

### 4.6 Project file

Everything above, plus alert settings, snapshots, and notes, saves to one JSON file (`*.safelifts.json`) with a `schemaVersion` field.

---

## 5. Features

### 5.1 3D view and camera
- Orbit camera (default), chase camera behind the lift, top-down orthographic camera, and operator view (from the platform at eye height).
- Floor grid with labeled scale. Units follow the display setting.
- Visibility toggles: sensor frustums, zone rays, coverage, obstacles, lasers, labels.

### 5.2 Manual driving
- **W/S or ↑/↓:** drive forward/back. **A/D or ←/→:** steer. **R/F:** raise/lower the platform. **Space:** stop.
- Kinematics: rear axle fixed, front wheels steer (bicycle model). Turning radius R = wheelbase / tan(steer angle).
- Drive speed is limited to the elevated speed when the platform is above the threshold.
- Smooth acceleration and deceleration (configurable) so motion looks realistic.
- **Collision:** if lift geometry would intersect an obstacle, stop the lift, flash the contacted surface, and log a COLLISION event. No physics engine is needed.
- HUD: speed, steer angle, platform height, current alert state.

### 5.3 Sensor library and module editor
- Panel listing sensor specs, with a form editing every field. Show derived values live:
  - **Angular size per zone** = FoV / zones (e.g., 45° / 8 = 5.6°).
  - **Zone footprint at distance d** = 2 · d · tan(zoneAngle / 2), shown for 0.5, 1, 2, 3, and 4 m.
  - **Effective max range by reflectivity** for common materials (see 6.1).
- Module editor: add, remove, and position sensors within a module, with a small 3D preview.
- Each sensor is drawn as a translucent frustum (pyramid) out to its max range. Optional per-zone ray lines.

### 5.4 Placement
- Add a module to the lift: pick module, pick snap point or free position, then adjust with a 3D move/rotate gizmo **and** exact numeric fields.
- Toggle chassis vs. platform attachment.
- Enable/disable individual placements to compare quickly.

### 5.5 Coverage analysis (core feature)
See section 6.2 for the algorithm.
- Computes from sensor parameters and placements only. It doesn't depend on the site, so it shows what the system *can* see.
- Visualizations:
  - **3D point cloud** of the danger envelope, each point colored: red = uncovered, yellow = 1 sensor, green = 2+ sensors.
  - **Horizontal slice view** at a chosen height (2D heatmap).
  - **Top-down map** at the current platform height.
- Metrics panel:
  - Overall coverage %.
  - Coverage % per region: front, rear, left, right, overhead (above guardrails), below platform (around the scissor stack), ground band (around the chassis).
  - **Largest blind spot:** size of the biggest connected uncovered region, reported as its bounding-box dimensions. Example: "a 30 cm object could hide at the rear-left corner, 1.2 m up."
  - Overlap histogram (how many points are seen by 0, 1, 2, 3+ sensors).
- **Height sweep:** compute coverage across platform heights from min to max and plot coverage % vs. height.
- Recomputes automatically (debounced) whenever a sensor spec, module, placement, envelope setting, or platform height changes. Runs in a Web Worker so the UI never freezes; shows progress.

### 5.6 Site scenes and obstacles
- Obstacle palette: click to place, then move/rotate/scale with the gizmo; numeric fields; delete; duplicate.
- Each obstacle type has sensible default dimensions, material, and reflectivity.
- **Phase presets** (procedurally generated from a seed, regenerable):
  - **Structure:** columns on a grid, beams overhead, open floor, some pallets.
  - **MEP rough-in:** ducts, pipes, conduit, cable trays, and sprinkler pipes at varied ceiling heights; partial walls.
  - **Framing/drywall:** stud walls, door openings, drywall stacks, carts.
  - **Finishes:** finished walls, door frames, ceiling grid, few floor obstacles.
- **Test scenes:**
  - **Door gauntlet:** a row of door frames at clear widths of 32, 33, 34, 36, and 42 in.
  - **Overhead hazard course:** pipes and ducts at stepped heights.
  - **Thin objects:** conduit, rebar, and cable at varying diameters.
  - **Dark objects:** low-reflectivity pipes.
- Import a 3D mesh (OBJ or GLB, e.g., a DroneDeploy export) as an obstacle with an adjustable scale and position.
- Future (not in v1): IFC/BIM import via `web-ifc`.

### 5.7 Live sensing and alerts
See section 6.1 for the sensor models.
- Each sensor updates at its own update rate while the sim runs.
- **Readout panel:**
  - For multizone ToF sensors, a zone grid heatmap (like the real 8×8 output) with distances; invalid zones shown as gray.
  - For radar, a list of detections (range, azimuth, elevation) plus a small polar plot.
- Detected points are drawn in the 3D view as small markers.
- **Alert settings:** caution distance and stop distance, measured from the nearest lift surface. Defaults: caution 1.0 m, stop 0.5 m. Editable.
- **Alert display:** a HUD indicator per direction (front, rear, left, right, overhead) in green/yellow/red; optional beep.
- **Ground truth:** every frame, compute the true minimum distance from the lift surfaces to each nearby obstacle (using BVH closest-point queries).
- **Event log** (shown in a panel, exportable to CSV):
  - `DETECTED_IN_TIME`: obstacle first detected while outside stop distance.
  - `LATE_DETECTION`: first detected only after entering stop distance.
  - `MISSED`: obstacle entered stop distance and was never detected by any sensor.
  - `COLLISION`.
- Each event records time, obstacle id/type, true distance, which sensors (if any) detected it, lift position, and platform height.
- `MISSED` and `LATE_DETECTION` events leave a persistent red marker in the scene until cleared, so blind spots found while driving are visible afterward.

### 5.8 Laser guidelines
See section 6.3.
- Two lasers, one at each front corner. Editable mount position, height, pitch, and yaw.
- **Mode A, fixed lines (default; matches current hardware):** lines project straight ahead from each mount onto the floor.
- **Mode B, steering-linked:** lines curve with the steering angle, like a backup camera.
- **True path ghost:** a translucent overlay of the lift's actual swept envelope for the current steering angle over the next N meters. This shows where fixed lines would mislead during turns.
- **Door clearance readout:** when a door frame lies within the projected path, show the left and right clearance in inches (or cm), and a pass/fail indicator based on the true swept envelope.

### 5.9 Configurations, notes, and comparison
- Save/load the whole project as a JSON file (download/upload). Autosave to browser storage, wrapped so it fails silently if unavailable.
- **Snapshot:** captures the current configuration, a screenshot of the 3D view, the coverage metrics, and a notes form (title, strengths, weaknesses, free text).
- **Comparison view:** select 2–4 snapshots and see screenshots, key metrics, and notes side by side.
- **Export report:** generates a printable HTML report (print to PDF from the browser) of selected snapshots.

### 5.10 Demo polish
- Clean lighting and materials, smooth animation, readable labels.
- Help overlay listing keyboard controls.
- Optional "demo mode": a guided sequence of camera moves and scenes for funding presentations.

---

## 6. Algorithms and model assumptions

Every model assumption must be documented in code comments **and** in an in-app "Model assumptions" panel, so engineering results are transparent.

### 6.1 Sensor models

**Multizone / single-zone ToF:**
1. Split the field of view into zonesX × zonesY angular cells.
2. Cast raysPerZoneSide² sub-rays through each cell, evenly spaced, against the scene BVH (obstacles and the lift's own geometry).
3. A hit counts only if its distance d satisfies `rangeMin ≤ d ≤ effectiveMax(ρ)`, where ρ is the surface's reflectivity:
   `effectiveMax(ρ) = rangeMax × sqrt(ρ / referenceReflectivity)`, capped at rangeMax.
   This follows from returned signal ∝ ρ / d². It is a first-order assumption to be refined with bench data.
4. If the fraction of a zone's rays that hit ≥ minZoneFill, the zone is valid. Its distance is the 10th-percentile hit distance (approximating "nearest target in zone") plus Gaussian noise with std dev `sigmaBase + sigmaPerMeter × d`. Otherwise the zone is invalid (no target).
5. A single-zone sensor is the special case zonesX = zonesY = 1.

**Radar (simplified, documented as an approximation):**
1. Cast rays over the field of view at the angular resolution.
2. Group hits by obstacle. An obstacle is detectable if its angular extent, converted to size at its range, is ≥ minTargetSize.
3. Each detectable obstacle is reported with probability detectionProbability per update, at the nearest hit's range (quantized to rangeResolution, plus noise) and angles (plus noise).
4. Material is ignored in v1 (noted in the assumptions panel).

**Self-occlusion:** the lift's own geometry (guardrails, platform, scissor stack, housings) blocks rays in both live sensing and coverage.

### 6.2 Coverage algorithm
1. **Danger envelope:** the set of points within `envelopeDistance` (default 1.0 m, editable) of the lift's outer surfaces at the current platform height, plus an overhead region from the guardrail top up to `overheadClearance` (default 1.0 m). Excludes points inside the lift and below the floor.
2. **Sample** the envelope on a regular grid (default spacing 5 cm, editable: coarser = faster).
3. For each sample point p and each sensor s: p is **covered by s** if:
   a. p is within s's field of view (angle test in the sensor frame),
   b. `rangeMin ≤ |p − s| ≤ rangeMax` (coverage assumes the reference reflectivity; the UI offers a "worst-case reflectivity" setting that applies effectiveMax), and
   c. the line of sight from s to p is not blocked by the lift itself.
4. Count sensors covering each point. Compute region metrics, the overlap histogram, and the largest connected uncovered region (6-connected flood fill).
5. Runs in a Web Worker; the lift's collision geometry is sent to the worker once and rebuilt only when lift geometry or height changes.

### 6.3 Laser and path geometry
- Bicycle model with rear axle fixed. For steering angle δ ≠ 0, the instantaneous center of rotation (ICR) lies on the rear-axle line at distance R = wheelbase / tan δ.
- The true swept envelope is the union of the lift footprint's positions as it rotates about the ICR over the preview distance (sampled every 5 cm of travel).
- Fixed lasers: straight rays from each mount along its orientation, intersected with the floor plane.
- Steering-linked lasers: arcs traced by each front corner about the ICR.
- Door clearance: minimum distance between the true swept envelope and each door jamb within the preview distance.

### 6.4 Performance targets
- 60 fps while driving with up to 12 multizone ToF sensors at 8×8 and 16 rays per zone (≈12k rays per sensor update, at 15 Hz).
- Coverage recompute at 5 cm spacing in under 3 seconds on a recent laptop.
- Use BVH acceleration on all scene geometry. Do sensor updates on a fixed timestep, independent of frame rate.

---

## 7. Project structure

```
src/
  app/          App.tsx, layout, keyboard handling
  state/        zustand stores (project, sim runtime, UI)
  units/        conversion + formatting
  lift/         types, presets, kinematics, LiftModel component, snap points
  sensors/      types, presets, tofModel, radarModel, derived values, frustum component
  modules/      types, presets, module editor
  placement/    placement logic, gizmo integration
  coverage/     envelope, coverage math, worker, visualization components
  scene/        obstacle types, defaults, generators (per phase), test scenes, importers
  sensing/      runtime sensor updates, ground truth, alerts, event log
  lasers/       laser + swept path geometry, components
  project/      save/load, schema version, snapshots, comparison, report export
  ui/           panels, forms, HUD, help overlay, assumptions panel
tests/          Vitest tests mirroring src/
```

---

## 8. Testing

Unit tests (Vitest) are required for all math:
- Unit conversions round-trip.
- Sensor frame transforms: a point straight ahead of a sensor with yaw 90° is where expected.
- FoV containment at boundaries.
- Zone footprint formula.
- `effectiveMax` reflectivity scaling.
- ToF model: sensor facing a flat wall at 2 m returns ~2 m in all zones; a wall beyond range gives invalid zones; a thin pipe covering less than minZoneFill of a zone is not detected.
- Coverage: a single sensor in an empty envelope matches a hand-calculated expected coverage within tolerance; self-occlusion by a test box reduces coverage.
- Bicycle-model turning radius and swept envelope for straight and turning cases.
- Door clearance for a known lift width and door width.

---

## 9. Future work (not in v1)
- IFC/BIM import of real Skanska floors.
- Bench calibration: import a CSV of real sensor measurements (true distance, measured distance, surface) and fit the noise and reflectivity parameters.
- Record and replay of driving runs.
- Automated parameter sweeps (e.g., try 50 placements and rank them by coverage).
- Haptic vs. buzzer alert modeling.
