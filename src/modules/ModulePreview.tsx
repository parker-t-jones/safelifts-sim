/**
 * Small orbit view of one module template. Pyramids are shortened so the
 * housing and the six aim directions stay readable. The lift draws the
 * real max range.
 */
import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { ModuleVisual, PREVIEW_FRUSTUM_M } from './ModuleVisual'
import type { SensorModule } from './types'

export function ModulePreview(props: { module: SensorModule }) {
  return (
    <div className="h-56 w-full overflow-hidden rounded-md border border-zinc-800 bg-zinc-950">
      <Canvas camera={{ position: [0.55, 0.38, 0.55], fov: 40, near: 0.01, far: 20 }}>
        <color attach="background" args={['#0f1419']} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[1, 2, 1]} intensity={1} />
        {/* three.js axes: red +X forward, green +Y up, blue +Z right. */}
        <axesHelper args={[0.2]} />
        <ModuleVisual
          module={props.module}
          showFrustums
          showRays={false}
          previewRange_m={PREVIEW_FRUSTUM_M}
          namePrefix="preview"
        />
        <OrbitControls enablePan={false} target={[0, 0, 0]} />
      </Canvas>
    </div>
  )
}
