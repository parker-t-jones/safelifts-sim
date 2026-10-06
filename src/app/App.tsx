/**
 * App shell: top bar, 3D view on the left, collapsible panel on the right.
 */
import { SidePanel } from './SidePanel'
import { TopBar } from './TopBar'
import { Viewport } from './Viewport'
import { useDriveKeyboard } from './useDriveKeyboard'
import { useUiStore } from '../state/uiStore'

export function App() {
  useDriveKeyboard()
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
