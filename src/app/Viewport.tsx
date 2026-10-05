/**
 * Main 3D view. World frame matches three.js: +Y is up, and the floor
 * is the plane Y = 0. The grid is drawn in that plane.
 */
import { useLayoutEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { formatLength } from '../units/format'
import { useUiStore } from '../state/uiStore'

/** Width of one grid square. Internal unit is meters. */
const GRID_CELL_M = 1
const GRID_CELLS_PER_SIDE = 40
const GRID_SIZE_M = GRID_CELL_M * GRID_CELLS_PER_SIDE

export function Viewport() {
  const unitSystem = useUiStore((state) => state.unitSystem)

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <Canvas camera={{ position: [8, 6, 8], fov: 50 }}>
        <AimCamera />
        <color attach="background" args={['#0f1419']} />
        <ambientLight intensity={0.7} />
        {/* High and to the side so the grid reads as a floor, not a flat color. */}
        <directionalLight position={[8, 14, 6]} intensity={1.15} />
        {/*
          gridHelper draws on the XZ plane (Y = 0).
          args: total size in meters, number of cells, centerline color, cell color.
        */}
        <gridHelper args={[GRID_SIZE_M, GRID_CELLS_PER_SIDE, '#94a3b8', '#334155']} />
        {/*
          Stop the orbit just above the horizon so the camera cannot swing
          through the floor and look up from underneath.
        */}
        <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-2 text-sm text-zinc-100">
        Grid cell: {formatLength(GRID_CELL_M, unitSystem)}
      </div>
    </div>
  )
}

/**
 * A new three.js camera looks straight ahead, not at the origin.
 * Aim it at the floor origin before the first paint so the grid is
 * visible immediately. OrbitControls keeps that aim while you drag.
 */
function AimCamera() {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}
