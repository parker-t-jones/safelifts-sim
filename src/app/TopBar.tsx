/**
 * Top bar: app name, imperial/metric toggle, and the side-panel control.
 */
import { useUiStore } from '../state/uiStore'

export function TopBar() {
  const unitSystem = useUiStore((state) => state.unitSystem)
  const setUnitSystem = useUiStore((state) => state.setUnitSystem)
  const sidePanelOpen = useUiStore((state) => state.sidePanelOpen)
  const setSidePanelOpen = useUiStore((state) => state.setSidePanelOpen)

  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
      <h1 className="text-lg font-semibold tracking-tight">SafeLifts Simulator</h1>
      <div className="flex items-center gap-3">
        <div role="group" aria-label="Display units" className="flex overflow-hidden rounded-md border border-zinc-700">
          <UnitButton
            label="Imperial"
            selected={unitSystem === 'imperial'}
            onSelect={() => setUnitSystem('imperial')}
          />
          <UnitButton
            label="Metric"
            selected={unitSystem === 'metric'}
            onSelect={() => setUnitSystem('metric')}
          />
        </div>
        <button
          type="button"
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 hover:bg-zinc-700"
          onClick={() => setSidePanelOpen(!sidePanelOpen)}
        >
          {sidePanelOpen ? 'Hide panel' : 'Show panel'}
        </button>
      </div>
    </header>
  )
}

function UnitButton(props: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      className={
        props.selected
          ? 'bg-sky-600 px-3 py-1.5 text-sm font-medium text-white'
          : 'bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700'
      }
      onClick={props.onSelect}
    >
      {props.label}
    </button>
  )
}
