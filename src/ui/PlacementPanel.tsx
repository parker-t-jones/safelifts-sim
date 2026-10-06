/**
 * Placement tab: put a whole module on a snap point or a free position,
 * then nudge it with numbers or the 3D gizmo.
 */
import { useState } from 'react'
import { placementAssumptions } from '../modules/assumptions'
import { SIX_CLUSTER_MODULE } from '../modules/preset'
import type { ModulePlacement } from '../placement/types'
import { snapPointsFor, type SnapPoint } from '../lift/snapPoints'
import { useLiftStore } from '../state/liftStore'
import { useModuleStore } from '../state/moduleStore'
import { usePlacementStore } from '../state/placementStore'
import { useUiStore } from '../state/uiStore'
import { inchesToMeters, metersToInches } from '../units/convert'
import { ModuleWarning } from './ModuleWarning'

const inputClass =
  'rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-sky-500'

export function PlacementPanel() {
  const modules = useModuleStore((state) => state.modules)
  const placements = usePlacementStore((state) => state.placements)
  const selectedId = usePlacementStore((state) => state.selectedId)
  const select = usePlacementStore((state) => state.select)
  const addPlacement = usePlacementStore((state) => state.addPlacement)
  const showFrustums = usePlacementStore((state) => state.showFrustums)
  const showZoneRays = usePlacementStore((state) => state.showZoneRays)
  const setShowFrustums = usePlacementStore((state) => state.setShowFrustums)
  const setShowZoneRays = usePlacementStore((state) => state.setShowZoneRays)
  const showSnapPoints = useLiftStore((state) => state.showSnapPoints)
  const setShowSnapPoints = useLiftStore((state) => state.setShowSnapPoints)
  const spec = useLiftStore((state) => state.spec)
  const snaps = snapPointsFor(spec)
  const [moduleId, setModuleId] = useState(SIX_CLUSTER_MODULE.id)
  const [snapId, setSnapId] = useState('guardrail-front-left')
  const chosenModule = modules.find((item) => item.id === moduleId) ?? modules[0] ?? null
  const placement = placements.find((item) => item.id === selectedId) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium">Placement</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
          A module is placed as one unit. Sensor poses inside it stay on the Modules tab. The
          gizmo appears on the selected module while this tab is open.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Check label="Show snap points" checked={showSnapPoints} onChange={setShowSnapPoints} />
        <Check label="Show frustums" checked={showFrustums} onChange={setShowFrustums} />
        <Check label="Show zone rays" checked={showZoneRays} onChange={setShowZoneRays} />
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-zinc-200">Add a module</h3>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Template
          <select
            className={inputClass}
            value={chosenModule?.id ?? ''}
            onChange={(event) => setModuleId(event.target.value)}
          >
            {modules.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <SnapSelect snaps={snaps} value={snapId} onChange={setSnapId} />
        <SmallButton
          label="Place module"
          disabled={!chosenModule}
          onClick={() => {
            if (!chosenModule) {
              return
            }
            const snap = snaps.find((item) => item.id === snapId) ?? null
            if (snap) {
              setShowSnapPoints(true)
            }
            addPlacement(chosenModule.id, snap)
          }}
        />
      </section>

      <div className="flex flex-col gap-2">
        {placements.map((item) => (
          <PlacementRow key={item.id} placement={item} selected={item.id === selectedId} onSelect={() => select(item.id)} />
        ))}
        {placements.length === 0 && (
          <p className="text-sm text-zinc-400">Nothing placed yet. Put the 6× cluster on a guardrail corner to start.</p>
        )}
      </div>

      {placement && <PlacementEditor placement={placement} snaps={snaps} />}

      <details className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Model assumptions</summary>
        <ul className="mt-3 flex flex-col gap-3">
          {placementAssumptions().map((item) => (
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

function PlacementRow(props: {
  placement: ModulePlacement
  selected: boolean
  onSelect: () => void
}) {
  const modules = useModuleStore((state) => state.modules)
  const updatePlacement = usePlacementStore((state) => state.updatePlacement)
  const module = modules.find((item) => item.id === props.placement.moduleId) ?? null

  return (
    <div
      className={
        props.selected
          ? 'flex flex-col gap-2 rounded-md border border-sky-600 bg-sky-950/40 p-2'
          : 'flex flex-col gap-2 rounded-md border border-zinc-800 p-2'
      }
    >
      <button type="button" className="text-left text-sm text-zinc-100" onClick={props.onSelect}>
        {module?.name ?? 'Missing module'} · {props.placement.attachTo}
        {props.placement.snapPointId ? '' : ' · free'}
      </button>
      <Check
        label="Enabled"
        checked={props.placement.enabled}
        onChange={(enabled) => updatePlacement(props.placement.id, { enabled })}
      />
      {module && <ModuleWarning module={module} />}
    </div>
  )
}

function PlacementEditor(props: { placement: ModulePlacement; snaps: SnapPoint[] }) {
  const modules = useModuleStore((state) => state.modules)
  const updatePlacement = usePlacementStore((state) => state.updatePlacement)
  const snapPlacement = usePlacementStore((state) => state.snapPlacement)
  const remove = usePlacementStore((state) => state.remove)
  const { placement } = props
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-200">Selected placement</h3>
      <p className="text-xs leading-relaxed text-zinc-500">
        Drag the arrows to move this module and the rings to rotate it. The numbers are yaw, then
        pitch, then roll. Switching between chassis and platform keeps the numbers, so the module
        jumps to the other frame.
      </p>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Template
        <select
          className={inputClass}
          value={placement.moduleId}
          onChange={(event) => updatePlacement(placement.id, { moduleId: event.target.value })}
        >
          {modules.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Attach to
        <select
          className={inputClass}
          value={placement.attachTo}
          onChange={(event) =>
            updatePlacement(placement.id, {
              attachTo: event.target.value === 'platform' ? 'platform' : 'chassis',
              snapPointId: null,
            })
          }
        >
          <option value="chassis">Chassis</option>
          <option value="platform">Platform</option>
        </select>
      </label>
      <SnapSelect
        snaps={props.snaps}
        value={placement.snapPointId ?? 'free'}
        onChange={(snapId) => {
          if (snapId === 'free') {
            updatePlacement(placement.id, { snapPointId: null })
            return
          }
          const snap = props.snaps.find((item) => item.id === snapId)
          if (snap) {
            snapPlacement(placement.id, snap)
          }
        }}
      />
      <p className="text-xs text-zinc-500">Position</p>
      <Vec3Fields
        labels={['X forward', 'Y up', 'Z right']}
        value={placement.position_m}
        length
        onChange={(position_m) => updatePlacement(placement.id, { position_m, snapPointId: null })}
      />
      <p className="text-xs text-zinc-500">Yaw, pitch, roll (degrees)</p>
      <Vec3Fields
        labels={['Yaw', 'Pitch', 'Roll']}
        value={placement.yawPitchRoll_deg}
        onChange={(yawPitchRoll_deg) => updatePlacement(placement.id, { yawPitchRoll_deg })}
      />
      <SmallButton label="Delete placement" onClick={() => remove(placement.id)} />
    </section>
  )
}

function SnapSelect(props: { snaps: SnapPoint[]; value: string; onChange: (snapId: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      Snap point
      <select className={inputClass} value={props.value} onChange={(event) => props.onChange(event.target.value)}>
        <option value="free">Free position</option>
        {props.snaps.map((snap) => (
          <option key={snap.id} value={snap.id}>
            {snap.label}
          </option>
        ))}
      </select>
    </label>
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

function Check(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-200">
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      {props.label}
    </label>
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
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {props.label}
      <input
        className={inputClass}
        type="number"
        step={props.step}
        value={roundInput(props.value)}
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

function roundInput(value: number): number {
  return Math.round(value * 1000) / 1000
}

function lengthToDisplay(length_m: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? length_m : metersToInches(length_m)
}

function lengthFromDisplay(displayValue: number, system: 'imperial' | 'metric'): number {
  return system === 'metric' ? displayValue : inchesToMeters(displayValue)
}
