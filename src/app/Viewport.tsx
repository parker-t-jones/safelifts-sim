/**
 * Main 3D view. World frame matches three.js: +Y is up, and the floor
 * is the plane Y = 0. The lift drives on that plane.
 */
import { Canvas } from '@react-three/fiber'
import { CameraRig } from './Cameras'
import { DriveLoop } from '../lift/DriveLoop'
import { LiftModel } from '../lift/LiftModel'
import { brakeDecel_mps2, driveIsDisabled, stoppingDistance_m } from '../lift/kinematics'
import { formatLength, formatSpeed, formatSteer } from '../units/format'
import { useLiftStore } from '../state/liftStore'
import { useUiStore } from '../state/uiStore'
import type { CameraMode } from '../state/uiStore'

/** Width of one grid square. Internal unit is meters. */
const GRID_CELL_M = 1
const GRID_CELLS_PER_SIDE = 40
const GRID_SIZE_M = GRID_CELL_M * GRID_CELLS_PER_SIDE

const CAMERAS: Array<{ mode: CameraMode; label: string }> = [
  { mode: 'orbit', label: 'Orbit' },
  { mode: 'chase', label: 'Chase' },
  { mode: 'top', label: 'Top-down' },
  { mode: 'operator', label: 'Operator' },
]

export function Viewport() {
  const unitSystem = useUiStore((state) => state.unitSystem)
  const cameraMode = useUiStore((state) => state.cameraMode)
  const setCameraMode = useUiStore((state) => state.setCameraMode)
  const speed_mps = useLiftStore((state) => state.pose.speed_mps)
  const maxDriveHeight_m = useLiftStore((state) => state.spec.maxDriveHeight_m)
  const driveDisabled = useLiftStore((state) =>
    driveIsDisabled(state.spec, state.pose.platformHeight_m),
  )
  const steer_rad = useLiftStore((state) => state.pose.steer_rad)
  const platformHeight_m = useLiftStore((state) => state.pose.platformHeight_m)
  const stopping_m = useLiftStore((state) =>
    stoppingDistance_m(
      state.pose.speed_mps,
      state.spec.operatorReaction_s,
      brakeDecel_mps2(state.spec, state.pose.platformHeight_m),
    ),
  )

  return (
    <div className="relative min-h-0 min-w-0 flex-1">
      <Canvas>
        <CameraRig mode={cameraMode} />
        <DriveLoop />
        <color attach="background" args={['#0f1419']} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[8, 14, 6]} intensity={1.15} />
        {/*
          gridHelper draws on the XZ plane (Y = 0).
          args: total size in meters, number of cells, centerline color, cell color.
        */}
        <gridHelper args={[GRID_SIZE_M, GRID_CELLS_PER_SIDE, '#94a3b8', '#334155']} />
        <LiftModel />
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute left-3 top-3 flex flex-wrap gap-1">
          {CAMERAS.map((camera) => {
            const selected = camera.mode === cameraMode
            return (
              <button
                key={camera.mode}
                type="button"
                aria-pressed={selected}
                className={
                  selected
                    ? 'rounded-md bg-sky-600 px-2.5 py-1 text-sm font-medium text-white'
                    : 'rounded-md bg-zinc-900/80 px-2.5 py-1 text-sm text-zinc-200 hover:bg-zinc-800'
                }
                onClick={() => setCameraMode(camera.mode)}
              >
                {camera.label}
              </button>
            )
          })}
        </div>
        <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-3 py-2 text-sm text-zinc-100">
          Grid cell: {formatLength(GRID_CELL_M, unitSystem)}
        </div>
        <div className="absolute bottom-3 right-3 rounded-md bg-black/60 px-3 py-2 text-sm leading-relaxed text-zinc-100">
          <p>Speed: {formatSpeed(speed_mps, unitSystem)}</p>
          <p>Steer: {formatSteer(steer_rad)}</p>
          <p>Platform: {formatLength(platformHeight_m, unitSystem)}</p>
          <p>
            Straight-line stopping distance:{' '}
            {stopping_m === null ? 'braking rate is zero' : formatLength(stopping_m, unitSystem)}
          </p>
          {driveDisabled && maxDriveHeight_m !== null && (
            <p className="text-amber-200">
              Drive disabled above {formatLength(maxDriveHeight_m, unitSystem)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
