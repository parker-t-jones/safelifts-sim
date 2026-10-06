/**
 * Scene tab. Place obstacles, load a construction phase or a test scene,
 * and read the collision list.
 */
import { useRef } from 'react'
import { forwardXZ } from '../lift/frames'
import { sceneAssumptions } from '../scene/assumptions'
import {
  DIMENSION_FIELDS,
  MATERIAL_LABELS,
  MATERIAL_REFLECTIVITY,
  MATERIALS,
  OBSTACLE_TYPES,
  TYPE_LABELS,
  type DimensionField,
} from '../scene/defaults'
import { EMPTY_SCENE, PHASE_LABELS, PHASES, doorGauntlet, darkObjects, generatePhase, overheadCourse, regenerateScene, thinObjects } from '../scene/generate'
import type { Obstacle, ObstacleMaterial, ObstacleType } from '../scene/types'
import { useLiftStore } from '../state/liftStore'
import { useSceneStore } from '../state/sceneStore'
import { useUiStore } from '../state/uiStore'
import { inchesToMeters, metersToInches } from '../units/convert'
import type { DisplayUnitSystem } from '../units/types'

export function ScenePanel() {
  const scene = useSceneStore((state) => state.scene)
  const selectedId = useSceneStore((state) => state.selectedId)
  const armedType = useSceneStore((state) => state.armedType)
  const showObstacles = useSceneStore((state) => state.showObstacles)
  const events = useSceneStore((state) => state.events)
  const importError = useSceneStore((state) => state.importError)
  const setArmedType = useSceneStore((state) => state.setArmedType)
  const setShowObstacles = useSceneStore((state) => state.setShowObstacles)
  const select = useSceneStore((state) => state.select)
  const loadScene = useSceneStore((state) => state.loadScene)
  const setSeed = useSceneStore((state) => state.setSeed)
  const setFloorSize = useSceneStore((state) => state.setFloorSize)
  const setCeiling = useSceneStore((state) => state.setCeiling)
  const placeAt = useSceneStore((state) => state.placeAt)
  const importFile = useSceneStore((state) => state.importFile)
  const clearEvents = useSceneStore((state) => state.clearEvents)
  const unitSystem = useUiStore((state) => state.unitSystem)
  const fileRef = useRef<HTMLInputElement>(null)
  const selected = scene.obstacles.find((item) => item.id === selectedId) ?? null
  const generated = scene.phase !== 'custom' || scene.id.startsWith('test-')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Scene</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          Drop obstacles on the floor, or load a phase. Driving into one stops the lift, flashes it,
          and adds a collision line.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Phases</h3>
        <div className="flex flex-wrap gap-1">
          {PHASES.map((phase) => (
            <button
              key={phase}
              type="button"
              className={buttonClass(false)}
              onClick={() => loadScene(generatePhase(phase, scene.seed))}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Seed
          <input
            className={inputClass}
            type="number"
            aria-label="Scene seed"
            value={scene.seed}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (Number.isFinite(next)) {
                setSeed(Math.round(next))
              }
            }}
          />
        </label>
        <button
          type="button"
          className={buttonClass(false)}
          onClick={() => loadScene(regenerateScene(scene))}
          disabled={!generated}
        >
          Regenerate
        </button>
        <p className="text-xs leading-relaxed text-zinc-500">
          {generated
            ? 'Regenerate replaces the obstacles. A phase uses the seed. A test scene rebuilds the same layout.'
            : 'This floor was not generated. Load a phase, then regenerate it from the seed.'}
        </p>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={buttonClass(false)} onClick={() => loadScene(doorGauntlet())}>
            Door gauntlet
          </button>
          <button type="button" className={buttonClass(false)} onClick={() => loadScene(overheadCourse())}>
            Overhead hazards
          </button>
          <button type="button" className={buttonClass(false)} onClick={() => loadScene(thinObjects())}>
            Thin objects
          </button>
          <button type="button" className={buttonClass(false)} onClick={() => loadScene(darkObjects())}>
            Dark objects
          </button>
          <button type="button" className={buttonClass(false)} onClick={() => loadScene(EMPTY_SCENE)}>
            Clear
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Floor</h3>
        <LengthField
          label="Width"
          length_m={scene.floorSize_m[0]}
          unitSystem={unitSystem}
          onChange={(width_m) => setFloorSize([Math.max(1, width_m), scene.floorSize_m[1]])}
        />
        <LengthField
          label="Depth"
          length_m={scene.floorSize_m[1]}
          unitSystem={unitSystem}
          onChange={(depth_m) => setFloorSize([scene.floorSize_m[0], Math.max(1, depth_m)])}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={scene.ceilingHeight_m !== null}
            onChange={(event) => setCeiling(event.target.checked ? 3 : null)}
          />
          Ceiling
        </label>
        {scene.ceilingHeight_m !== null ? (
          <LengthField
            label="Ceiling height"
            length_m={scene.ceilingHeight_m}
            unitSystem={unitSystem}
            onChange={(ceilingHeight_m) => setCeiling(Math.max(0.5, ceilingHeight_m))}
          />
        ) : null}
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={showObstacles}
            onChange={(event) => setShowObstacles(event.target.checked)}
          />
          Show obstacles
        </label>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Place an obstacle</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Click a type to drop one in front of the lift. Then click the floor to drop another.
        </p>
        <div className="flex flex-wrap gap-1">
          {OBSTACLE_TYPES.filter((type) => type !== 'importedMesh').map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={armedType === type}
              className={buttonClass(armedType === type)}
              onClick={() => {
                setArmedType(type)
                dropInFront(type, placeAt)
              }}
            >
              {TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        {armedType ? (
          <button type="button" className={buttonClass(false)} onClick={() => setArmedType(null)}>
            Stop placing
          </button>
        ) : null}
        <button type="button" className={buttonClass(false)} onClick={() => fileRef.current?.click()}>
          Import OBJ or GLB
        </button>
        <input
          ref={fileRef}
          className="hidden"
          type="file"
          accept=".obj,.glb,.gltf"
          aria-label="Import OBJ or GLB"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) {
              return
            }
            const pose = useLiftStore.getState().pose
            const forward = forwardXZ(pose.yaw_rad)
            void importFile(file, [pose.x_m + forward.x * 3, 0.5, pose.z_m + forward.z * 3])
          }}
        />
        {importError ? <p className="text-sm text-red-300">{importError}</p> : null}
        <p className="text-xs leading-relaxed text-zinc-500">
          The file is kept for this session. Scale it if the units are not meters. A missing file
          shows as a 1 m cube.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Obstacles</h3>
        {scene.obstacles.length === 0 ? (
          <p className="text-sm text-zinc-400">None yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {scene.obstacles.map((obstacle) => (
              <li key={obstacle.id}>
                <button
                  type="button"
                  className={
                    obstacle.id === selectedId
                      ? 'w-full rounded-md bg-zinc-800 px-2 py-1 text-left text-sm text-zinc-100'
                      : 'w-full rounded-md px-2 py-1 text-left text-sm text-zinc-300 hover:bg-zinc-800'
                  }
                  onClick={() => select(obstacle.id)}
                >
                  {obstacle.label || TYPE_LABELS[obstacle.type]}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected ? <ObstacleEditor obstacle={selected} unitSystem={unitSystem} /> : null}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Collisions</h3>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-400">None yet. Drive into an obstacle.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-red-200">
            {events.map((event) => (
              <li key={event.id}>{event.message}</li>
            ))}
          </ul>
        )}
        {events.length > 0 ? (
          <button type="button" className={buttonClass(false)} onClick={clearEvents}>
            Clear
          </button>
        ) : null}
      </section>

      <details className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Model assumptions</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {sceneAssumptions().map((item) => (
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

function dropInFront(
  type: ObstacleType,
  placeAt: (type: ObstacleType, x_m: number, z_m: number) => void,
) {
  const pose = useLiftStore.getState().pose
  const forward = forwardXZ(pose.yaw_rad)
  placeAt(type, pose.x_m + forward.x * 3, pose.z_m + forward.z * 3)
}

function ObstacleEditor(props: { obstacle: Obstacle; unitSystem: DisplayUnitSystem }) {
  const updateObstacle = useSceneStore((state) => state.updateObstacle)
  const duplicateObstacle = useSceneStore((state) => state.duplicateObstacle)
  const deleteObstacle = useSceneStore((state) => state.deleteObstacle)
  const obstacle = props.obstacle
  const fields = DIMENSION_FIELDS[obstacle.type]

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-800 p-2">
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Label
        <input
          className={inputClass}
          aria-label="Obstacle label"
          value={obstacle.label ?? ''}
          onChange={(event) => updateObstacle(obstacle.id, { label: event.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Material
        <select
          className={inputClass}
          aria-label="Obstacle material"
          value={obstacle.material}
          onChange={(event) => {
            const material = event.target.value as ObstacleMaterial
            updateObstacle(obstacle.id, { material, reflectivity: MATERIAL_REFLECTIVITY[material] })
          }}
        >
          {MATERIALS.map((material) => (
            <option key={material} value={material}>
              {MATERIAL_LABELS[material]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Reflectivity (0 to 1)
        <input
          className={inputClass}
          type="number"
          min={0}
          max={1}
          step={0.01}
          aria-label="Obstacle reflectivity"
          value={obstacle.reflectivity}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) {
              updateObstacle(obstacle.id, { reflectivity: Math.min(1, Math.max(0, next)) })
            }
          }}
        />
      </label>
      <p className="text-xs text-zinc-500">Position</p>
      {(['X', 'Y', 'Z'] as const).map((axis, index) => (
        <LengthField
          key={axis}
          label={axis}
          length_m={obstacle.position_m[index]}
          unitSystem={props.unitSystem}
          onChange={(value) => {
            const position_m: [number, number, number] = [...obstacle.position_m]
            position_m[index] = value
            updateObstacle(obstacle.id, { position_m })
          }}
        />
      ))}
      <p className="text-xs text-zinc-500">Rotation (degrees)</p>
      {(['Yaw', 'Pitch', 'Roll'] as const).map((axis, index) => (
        <label key={axis} className="flex flex-col gap-1 text-xs text-zinc-400">
          {axis}
          <input
            className={inputClass}
            type="number"
            step={1}
            aria-label={axis}
            value={Math.round(obstacle.yawPitchRoll_deg[index] * 1000) / 1000}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (!Number.isFinite(next)) {
                return
              }
              const yawPitchRoll_deg: [number, number, number] = [...obstacle.yawPitchRoll_deg]
              yawPitchRoll_deg[index] = next
              updateObstacle(obstacle.id, { yawPitchRoll_deg })
            }}
          />
        </label>
      ))}
      {fields.map((field) => (
        <DimensionInput
          key={field.key}
          field={field}
          obstacle={obstacle}
          unitSystem={props.unitSystem}
          onChange={(dimensions_m) => updateObstacle(obstacle.id, { dimensions_m })}
        />
      ))}
      <div className="flex gap-1">
        <button type="button" className={buttonClass(false)} onClick={() => duplicateObstacle(obstacle.id)}>
          Duplicate
        </button>
        <button type="button" className={buttonClass(false)} onClick={() => deleteObstacle(obstacle.id)}>
          Delete
        </button>
      </div>
    </div>
  )
}

function DimensionInput(props: {
  field: DimensionField
  obstacle: Obstacle
  unitSystem: DisplayUnitSystem
  onChange: (dimensions_m: Record<string, number>) => void
}) {
  const value = props.obstacle.dimensions_m[props.field.key] ?? 0
  if (props.field.key === 'scale') {
    return (
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Scale
        <input
          className={inputClass}
          type="number"
          min={0.001}
          step={0.1}
          aria-label="Scale"
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next) && next > 0) {
              props.onChange({ ...props.obstacle.dimensions_m, scale: next })
            }
          }}
        />
      </label>
    )
  }
  return (
    <LengthField
      label={props.field.label}
      length_m={value}
      unitSystem={props.unitSystem}
      onChange={(length_m) =>
        props.onChange({ ...props.obstacle.dimensions_m, [props.field.key]: Math.max(0.001, length_m) })
      }
    />
  )
}

function LengthField(props: {
  label: string
  length_m: number
  unitSystem: DisplayUnitSystem
  onChange: (length_m: number) => void
}) {
  const display = props.unitSystem === 'metric' ? props.length_m : metersToInches(props.length_m)
  const unit = props.unitSystem === 'metric' ? 'm' : 'in'
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {props.label} ({unit})
      <input
        className={inputClass}
        type="number"
        step={props.unitSystem === 'metric' ? 0.01 : 0.1}
        aria-label={props.label}
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

function buttonClass(selected: boolean): string {
  return selected
    ? 'rounded-md bg-sky-600 px-2.5 py-1 text-sm font-medium text-white'
    : 'rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-300 hover:bg-zinc-700'
}

const inputClass =
  'rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500'
