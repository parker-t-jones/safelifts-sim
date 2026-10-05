/**
 * App shell: top bar, 3D view on the left, collapsible panel on the right.
 * Feature panels (lift, sensors, and so on) are filled in later milestones.
 */
import { SidePanel } from './SidePanel'
import { TopBar } from './TopBar'
import { Viewport } from './Viewport'
import { useUiStore } from '../state/uiStore'

export function App() {
  const sidePanelOpen = useUiStore((state) => state.sidePanelOpen)

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Viewport />
        {sidePanelOpen ? <SidePanel /> : null}
      </div>
    </div>
  )
}
