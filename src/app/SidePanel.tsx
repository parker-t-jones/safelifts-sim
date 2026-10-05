/**
 * Right-hand panel with one tab per later feature area.
 * The tabs switch a placeholder. They do not load those features yet.
 */
import { useState } from 'react'

const SIDE_TABS = [
  'Lift',
  'Sensors',
  'Placement',
  'Coverage',
  'Scene',
  'Lasers',
  'Notes',
] as const

type SideTab = (typeof SIDE_TABS)[number]

export function SidePanel() {
  const [activeTab, setActiveTab] = useState<SideTab>('Lift')

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900">
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
      <div className="flex flex-1 flex-col gap-2 p-4" role="tabpanel">
        <h2 className="text-base font-medium">{activeTab}</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          This tab is empty for now. Later milestones fill it in.
        </p>
      </div>
    </aside>
  )
}
