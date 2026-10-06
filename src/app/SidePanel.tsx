/**
 * Right-hand panel. Lift edits the machine. Sensors edits the library.
 * Modules edits housings. Placement puts a housing on the lift.
 * Coverage reports what those sensors can see.
 */
import { CoveragePanel } from '../ui/CoveragePanel'
import { ModulesPanel } from '../ui/ModulesPanel'
import { PlacementPanel } from '../ui/PlacementPanel'
import { LiftPanel } from '../ui/LiftPanel'
import { SensorsPanel } from '../ui/SensorsPanel'
import { SIDE_TABS } from '../state/uiStore'
import { useUiStore } from '../state/uiStore'

export function SidePanel() {
  const activeTab = useUiStore((state) => state.sideTab)
  const setActiveTab = useUiStore((state) => state.setSideTab)

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap gap-1 border-b border-zinc-800 p-3" role="tablist" aria-label="Side panel">
        {SIDE_TABS.map((tab) => {
          const selected = tab === activeTab
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? 'rounded-md bg-sky-600 px-2.5 py-1 text-sm font-medium text-white'
                  : 'rounded-md bg-zinc-800 px-2.5 py-1 text-sm text-zinc-300 hover:bg-zinc-700'
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          )
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" role="tabpanel">
        {activeTab === 'Lift' ? (
          <LiftPanel />
        ) : activeTab === 'Sensors' ? (
          <SensorsPanel />
        ) : activeTab === 'Modules' ? (
          <ModulesPanel />
        ) : activeTab === 'Placement' ? (
          <PlacementPanel />
        ) : activeTab === 'Coverage' ? (
          <CoveragePanel />
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="text-base font-medium">{activeTab}</h2>
            <p className="text-sm leading-relaxed text-zinc-400">
              This tab is empty for now. Later milestones fill it in.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
