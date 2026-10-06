/**
 * Modules tab: edit a housing and the sensor poses inside it.
 * The small 3D view uses shortened pyramids. Placements draw full range.
 */
import { moduleAssumptions } from '../modules/assumptions'
import { ModulePreview } from '../modules/ModulePreview'
import { sensorColor } from '../modules/ModuleVisual'
import type { ModuleSensor, SensorModule } from '../modules/types'
import { useModuleStore } from '../state/moduleStore'
import { usePlacementStore } from '../state/placementStore'
import { useSensorStore } from '../state/sensorStore'
import { useUiStore } from '../state/uiStore'
import { inchesToMeters, metersToInches } from '../units/convert'
import { ModuleWarning } from './ModuleWarning'

const inputClass =
  'rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500'

export function ModulesPanel() {
  const modules = useModuleStore((state) => state.modules)
  const selectedId = useModuleStore((state) => state.selectedId)
  const select = useModuleStore((state) => state.select)
  const createSixCluster = useModuleStore((state) => state.createSixCluster)
  const createSingle = useModuleStore((state) => state.createSingle)
  const duplicate = useModuleStore((state) => state.duplicate)
  const remove = useModuleStore((state) => state.remove)
  const removePlacements = usePlacementStore((state) => state.removeForModule)
  const module = modules.find((item) => item.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Modules</h2>
        <p className="mt-1 text-sm leading-relaxed text-amber-200/90">
          The 6× VL53L8CX cluster is approximate until its spacing matches the CAD. Editing a
          template changes every placement that uses it.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {modules.map((item) => {
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
              {item.name} — {item.sensors.length} sensor{item.sensors.length === 1 ? '' : 's'}
            </button>
          )
        })}
        {modules.length === 0 && <p className="text-sm text-zinc-400">No modules yet.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <SmallButton label="New 6× cluster" onClick={createSixCluster} />
        <SmallButton label="New single" onClick={createSingle} />
        <SmallButton label="Duplicate" onClick={() => module && duplicate(module.id)} disabled={!module} />
        <SmallButton
          label="Delete"
          onClick={() => {
            if (!module) {
              return
            }
            removePlacements(module.id)
            remove(module.id)
          }}
          disabled={!module}
        />
      </div>

      {module && <ModuleEditor module={module} />}

      <details className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Model assumptions</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {moduleAssumptions().map((item) => (
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

function ModuleEditor(props: { module: SensorModule }) {
  const updateModule = useModuleStore((state) => state.updateModule)
  const addSensor = useModuleStore((state) => state.addSensor)
  const unitSystem = useUiStore((state) => state.unitSystem)
  const lengthUnit = unitSystem === 'metric' ? 'm' : 'in'
  const { module } = props

  return (
    <div className="flex flex-col gap-4">
      <NumberField
        label="Name"
        text
        value={module.name}
        onText={(name) => updateModule(module.id, { name })}
      />
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Notes
        <textarea
          className={inputClass}
          rows={3}
          value={module.notes}
          onChange={(event) => updateModule(module.id, { notes: event.target.value })}
        />
      </label>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Housing ({lengthUnit})</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Size along module X (forward), Y (up), and Z (right). Approximate for the cluster.
        </p>
        <Vec3Fields
          labels={['Depth (X)', 'Height (Y)', 'Width (Z)']}
          value={module.housingSize_m}
          length
          onChange={(housingSize_m) =>
            updateModule(module.id, {
              housingSize_m: housingSize_m.map((item) => Math.abs(item)) as [number, number, number],
            })
          }
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Preview</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Red is forward, green is up, blue is right. The pyramids here are shortened. Placed
          modules use each sensor’s max range.
        </p>
        <ModulePreview module={module} />
      </section>

      <ModuleWarning module={module} />

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-200">Sensors in this module</h3>
        <p className="text-xs leading-relaxed text-zinc-500">
          Positions are in the module frame. Yaw, then pitch, then roll, in degrees. Positive yaw
          aims left. Positive pitch aims up.
        </p>
        {module.sensors.map((sensor, index) => (
          <SensorCard key={sensor.id} moduleId={module.id} sensor={sensor} color={sensorColor(index)} />
        ))}
        <SmallButton label="Add sensor" onClick={() => addSensor(module.id)} />
      </section>
    </div>
  )
}

function SensorCard(props: { moduleId: string; sensor: ModuleSensor; color: string }) {
  const updateSensor = useModuleStore((state) => state.updateSensor)
  const removeSensor = useModuleStore((state) => state.removeSensor)
  const specs = useSensorStore((state) => state.specs)
  const { sensor } = props

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-800 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-200" style={{ color: props.color }}>
          {sensor.name}
        </span>
        <SmallButton
          label="Remove"
          onClick={() => removeSensor(props.moduleId, sensor.id)}
        />
      </div>
      <NumberField
        label="Name"
        text
        value={sensor.name}
        onText={(name) => updateSensor(props.moduleId, sensor.id, { name })}
      />
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Sensor spec
        <select
          className={inputClass}
          value={sensor.sensorSpecId}
          onChange={(event) => updateSensor(props.moduleId, sensor.id, { sensorSpecId: event.target.value })}
        >
          {specs.length === 0 && <option value={sensor.sensorSpecId}>Missing sensor</option>}
          {specs.map((spec) => (
            <option key={spec.id} value={spec.id}>
              {spec.name}
              {spec.approximate ? ' (approximate)' : ''}
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-zinc-500">Position in the module</p>
      <Vec3Fields
        labels={['X forward', 'Y up', 'Z right']}
        value={sensor.position_m}
        length
        onChange={(position_m) => updateSensor(props.moduleId, sensor.id, { position_m })}
      />
      <p className="text-xs text-zinc-500">Yaw, pitch, roll (degrees)</p>
      <Vec3Fields
        labels={['Yaw', 'Pitch', 'Roll']}
        value={sensor.yawPitchRoll_deg}
        onChange={(yawPitchRoll_deg) => updateSensor(props.moduleId, sensor.id, { yawPitchRoll_deg })}
      />
    </div>
  )
}

function Vec3Fields(props: {
  labels: [string, string, string]
  value: [number, number, number]
  length?: boolean
  onChange: (value: [number, number, number]) => void
}) {
  const unitSystem = useUiStore((state) => state.unitSystem)
  const shown = props.value.map((item) =>
    props.length ? lengthToDisplay(item, unitSystem) : item,
  ) as [number, number, number]

  function edit(index: 0 | 1 | 2, display: number) {
    const next = [...props.value] as [number, number, number]
    next[index] = props.length ? lengthFromDisplay(display, unitSystem) : display
    props.onChange(next)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {props.labels.map((label, index) => (
        <NumberField
          key={label}
          label={label}
          value={shown[index]}
          step={props.length ? (unitSystem === 'metric' ? 0.001 : 0.1) : 1}
          onChange={(display) => edit(index as 0 | 1 | 2, display)}
        />
      ))}
    </div>
  )
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

function NumberField(props: {
  label: string
  step?: number
  text?: boolean
  value: number | string
  onChange?: (value: number) => void
  onText?: (value: string) => void
}) {
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

function lengthToDisplay(length_m: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? length_m : metersToInches(length_m)
}

function lengthFromDisplay(displayValue: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? displayValue : inchesToMeters(displayValue)
}
