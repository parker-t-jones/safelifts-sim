# SafeLifts Simulator — Cursor Playbook

Step-by-step instructions for building the simulator with Cursor. Do the milestones **in order**, one at a time. Each one ends with something you can see and test in the browser.

---

## Part 1: One-time setup (Mac)

1. **Install Node.js:** go to nodejs.org, download the **LTS** version, run the installer.
2. **Install Cursor:** cursor.com, download and install.
3. **Create a GitHub account** (github.com) if you don't have one. You'll use it for backups and for hosting the demo.
4. **Create the project folder:** make a folder called `safelifts-sim` anywhere (e.g., Documents).
5. **Add the planning files:**
   - Put `SPEC.md` and `CURSOR_PLAYBOOK.md` in the root of `safelifts-sim`.
   - Create the folder `safelifts-sim/.cursor/rules/` and put `project.mdc` inside it. (Folders starting with a dot are hidden on Mac; press **Cmd + Shift + .** in Finder to show them, or let Cursor create the folder: right-click in Cursor's file panel → New Folder.)
6. **Open the folder in Cursor:** File → Open Folder → `safelifts-sim`.
7. **Open the chat:** press **Cmd + L**. Make sure it's in **Agent** mode (dropdown at the bottom of the chat box), so Cursor can create files and run commands.

---

## Part 2: How to work with Cursor

- **Paste one milestone prompt at a time.** Wait until it finishes and you've checked the result before moving on.
- **Approve commands** when Cursor asks to run them (`npm install`, `npm test`, etc.).
- **Start the app:** in Cursor's terminal (**Ctrl + **), run `npm run dev`, then open the link it prints (usually http://localhost:5173). Leave it running; the page updates as Cursor changes code.
- **Save your progress after every milestone** (this lets you undo if something breaks). Paste this into the chat:
  > Commit all changes to git with a message describing this milestone.
- **If something breaks:** copy the error (from the terminal or the browser console: right-click the page → Inspect → Console) and paste it into the chat with "This error appears when I [what you did]. Fix it."
- **If Cursor goes off track:** say "Undo the last changes" or revert to the last commit:
  > Revert all changes since the last git commit.
- **Start a new chat for each milestone** (the + button in the chat panel). Long chats make the AI lose focus. The rules file and SPEC.md give each new chat the context it needs.
- **Asking for changes later:** describe what you want in plain words and reference the spec section, e.g., "Per SPEC 5.5, add a coverage slice at a height I choose with a slider."

---

## Part 3: Milestone prompts

### Milestone 0 — Project scaffold

```
Read SPEC.md and .cursor/rules/project.mdc fully.

Set up the project per SPEC.md section 2 and 7:
- Vite + React + TypeScript (strict), Tailwind, Vitest, @react-three/fiber, @react-three/drei, three, three-mesh-bvh, zustand.
- git init with a sensible .gitignore.
- App layout: a large 3D view on the left, a collapsible side panel on the right with tabs (Lift, Sensors, Placement, Coverage, Scene, Lasers, Notes), and a top bar with the app name "SafeLifts Simulator" and a units toggle (Imperial / Metric).
- 3D view: floor grid (Y=0), lighting, orbit camera.
- src/units/ with conversion and formatting functions plus unit tests.
- npm scripts: dev, build, test.

When done, tell me how to run it and what I should see.
```

**Check:** the app opens in the browser, shows a grid and an empty side panel with tabs, and the units toggle switches. `npm test` passes.

---

### Milestone 1 — Lift model and manual driving

```
Implement SPEC.md sections 4.4 and 5.2 (and the camera parts of 5.1).

- LiftSpec type and the default "32-in slab scissor, 19-ft class" preset. Mark every value as approximate in the UI.
- 3D lift model built from the spec: chassis, wheels, animated scissor stack, platform, guardrails, extension deck. Clear visual style.
- Lift tab in the side panel: edit all LiftSpec values, show the platform height slider.
- Keyboard driving per 5.2 with the bicycle model, elevated speed limit, smooth acceleration.
- HUD showing speed, steer angle, platform height (in display units).
- Camera modes: orbit, chase, top-down, operator view. Buttons to switch.
- Expose named snap points on the lift (SPEC 4.3) and draw them as small markers when a toggle is on.
- Unit tests for the kinematics (turning radius, straight driving, speed limit when elevated).

No obstacles or collisions yet.
```

**Check:** you can drive with WASD, raise/lower with R/F, switch cameras, and edit the lift dimensions.

---

### Milestone 2 — Sensor library and frustums

```
Implement SPEC.md section 4.1 and 5.3 (sensor library part only, no modules yet).

- SensorSpec type and the presets: VL53L8CX 8x8, VL53L8CX 4x4, Generic radar template. Label them "verify against datasheet".
- Sensors tab: list of specs; create, duplicate, edit, delete. A form for every field, with angles entered in degrees.
- Derived values shown live: angle per zone, zone footprint at 0.5/1/2/3/4 m, effective max range for common materials (SPEC 6.1 formula).
- A test mode that places one selected sensor in front of the lift so I can see its frustum (translucent pyramid to max range) and optional per-zone ray lines.
- Unit tests for derived values and the effectiveMax formula.
```

**Check:** editing the field of view or range visibly changes the frustum; derived values update.

---

### Milestone 3 — Modules and placement

```
Implement SPEC.md sections 4.2, 4.3, and 5.4.

- SensorModule type and presets: "Single sensor" and "6x cluster" (top row pitch 0, bottom row pitch -45, yaws -45/0/+45 in each row).
- Module editor: add/remove sensors in a module, edit their position and yaw/pitch/roll, with a small 3D preview.
- Placement tab: add a module to the lift, pick a snap point or free position, attach to chassis or platform, adjust with a 3D move/rotate gizmo AND numeric fields, enable/disable, delete.
- Platform-attached modules move with the platform height. Chassis-attached ones don't.
- Remove the test mode from Milestone 2; frustums now come from placements.
- Unit tests for the frame transforms (SPEC 3 rotation order) and module-to-lift-to-world transforms.
```

**Check:** put a 6× cluster on each front corner of the guardrail, raise the platform, and confirm the frustums move with it. Compare the frustum layout against your CAD.

---

### Milestone 4 — Coverage analysis

```
Implement SPEC.md sections 5.5 and 6.2.

- Danger envelope with editable envelope distance, overhead clearance, and grid spacing.
- Coverage computation in a Web Worker, including self-occlusion by the lift's own geometry, using three-mesh-bvh.
- "Worst-case reflectivity" setting per SPEC 6.2.
- Visualizations: 3D colored point cloud (red/yellow/green), horizontal slice at a chosen height, top-down map. Toggleable.
- Metrics panel: overall %, per-region %, overlap histogram, largest blind spot with its size and location.
- Height sweep with a chart of coverage % vs platform height.
- Auto-recompute (debounced) when anything relevant changes, with a progress indicator.
- Unit tests from SPEC section 8 (coverage cases).
```

**Check:** with no sensors everything is red; add one cluster and a green/yellow wedge appears in front; the per-region numbers make sense. Try your 6× cluster: is horizontal coverage really ~135° or ~180°?

---

### Milestone 5 — Site scenes and obstacles

```
Implement SPEC.md sections 4.5 and 5.6 (except IFC import).

- Obstacle types with default dimensions, material, and reflectivity.
- Scene tab: obstacle palette, click to place, gizmo + numeric editing, duplicate, delete.
- Procedural generators for the four phases, driven by a seed, with a "Regenerate" button.
- Test scenes: door gauntlet, overhead hazard course, thin objects, dark objects.
- OBJ/GLB import as an obstacle with scale and position controls.
- Lift-vs-obstacle collision per SPEC 5.2: stop, flash, log a COLLISION event (simple event list for now).
- All scene geometry goes into a BVH for later ray casting.
```

**Check:** load each phase preset and drive through it; you stop at walls; the door gauntlet has the right widths (measure with the numeric fields).

---

### Milestone 6 — Live sensing, alerts, and missed-detection logging

```
Implement SPEC.md sections 5.7 and 6.1.

- ToF model (multizone and single-zone) and the simplified radar model, exactly as described in 6.1, on a fixed timestep at each sensor's update rate. Self-occlusion included.
- Readout panel: zone heatmap per ToF sensor with distances (gray = invalid), detection list + polar plot per radar.
- Detected points drawn as markers in 3D.
- Alert settings (caution and stop distance), HUD direction indicators, optional beep.
- Ground-truth minimum distance via BVH closest-point queries.
- Event log with DETECTED_IN_TIME, LATE_DETECTION, MISSED, COLLISION; persistent red markers for MISSED and LATE_DETECTION; CSV export; clear button.
- "Model assumptions" panel listing every assumption from SPEC 6.
- Performance per SPEC 6.4. Unit tests from SPEC 8 (ToF cases).
```

**Check:** drive toward a wall; the zone heatmap shows it; alerts go yellow then red. Run the thin-objects and dark-objects scenes and look for MISSED events, which is where weaknesses show up.

---

### Milestone 7 — Laser guidelines

```
Implement SPEC.md sections 5.8 and 6.3.

- Two front-corner lasers with editable mount position, height, pitch, yaw.
- Mode A (fixed straight lines) and Mode B (steering-linked arcs), switchable.
- True swept-path ghost for the current steering angle over an editable preview distance.
- Door clearance readout (left/right) and pass/fail when a door frame is in the path.
- Laser lines rendered as bright, thin, glowing lines on the floor, readable in demos.
- Unit tests for swept envelope and door clearance (SPEC 8).
```

**Check:** in the door gauntlet, steer slightly while approaching a 34-in door and compare the fixed lines with the true path ghost.

---

### Milestone 8 — Save/load, snapshots, comparison, report

```
Implement SPEC.md sections 4.6 and 5.9.

- Save/load project JSON with schemaVersion; autosave to localStorage (wrapped in try/catch).
- Snapshot button: captures config, 3D screenshot, coverage metrics, and a notes form (title, strengths, weaknesses, free text).
- Notes tab: list of snapshots; comparison view for 2-4 snapshots side by side.
- Export a printable HTML report of selected snapshots.
```

**Check:** save two different sensor layouts as snapshots with notes, compare them, export the report, reload the page, and confirm everything is still there.

---

### Milestone 9 — Demo polish and hosting

```
Implement SPEC.md section 5.10 and deploy.

- Visual polish pass: lighting, materials, label readability, consistent colors.
- Help overlay with keyboard controls (toggle with H or ?).
- Demo mode: a guided sequence of camera moves through a preset scene showing coverage, live alerts, and lasers.
- Deploy to GitHub Pages (or Vercel). Walk me through every step, including creating the GitHub repo.
```

**Check:** open the hosted link on another computer or phone.

---

## Part 4: After v1

Good next additions, each its own prompt (see SPEC section 9):
- **Bench calibration:** "Add a calibration tool: I upload a CSV of real VL53L8CX measurements (true distance, measured distance, surface material) and it fits sigmaBase, sigmaPerMeter, and the reflectivity scaling for that sensor spec."
- **BIM import:** "Add IFC import using web-ifc so I can load a floor from a Skanska BIM model."
- **Automated placement search:** "Try many placements of N modules and rank them by coverage %."
