/**
 * Plain-language model assumptions shown in the Lift tab.
 * Each entry matches a comment next to the code that implements it.
 * Sensor assumptions are added when those models exist.
 */
import { OPERATOR_EYE_HEIGHT_M } from './visual'

export interface ModelAssumption {
  title: string
  detail: string
}

export function liftAssumptions(): ModelAssumption[] {
  return [
    {
      title: 'Axles',
      detail:
        'The rear axle is half a wheelbase behind the chassis center. The front axle is half a wheelbase ahead. Only the front wheels steer.',
    },
    {
      title: 'Turning',
      detail:
        'Turning radius to the rear axle is wheelbase / tan(steer angle). A steer angle of zero drives straight. Positive steer is a left turn, toward the lift’s −Z, while driving forward.',
    },
    {
      title: 'Speed limit',
      detail:
        'The slower elevated speed is used only when the platform floor is above the threshold. At the threshold, the stowed speed still applies.',
    },
    {
      title: 'Acceleration and braking',
      detail:
        'Drive acceleration is used only while speed is increasing. Releasing the throttle, pressing the opposite direction, or holding Space slows the lift at the braking rate. The stowed braking rate applies at or below the elevated-speed height. The elevated braking rate applies only above that height. Space does not cut the speed to zero in one frame.',
    },
    {
      title: 'Control latency',
      detail:
        'Optional machine delay before W, S, A, D, and Space take effect. The default is 0 seconds, so those keys respond immediately. A new drive command restarts the wait. R and F raise and lower on the same frame.',
    },
    {
      title: 'Operator reaction time',
      detail:
        'The HUD straight-line stopping distance is speed times this reaction time, plus speed squared divided by twice the current braking rate. That is how far the rear axle would travel if the operator decided to stop now and then braked in a straight line. Keyboard driving does not wait for it. The warning-distance preview adds frames-to-confirm update periods and the sensor processing latency before this reaction time. When alerts exist, an optional auto-brake can wait this long after an alert before it starts.',
    },
    {
      title: 'Max drive height',
      detail:
        'Optional. Leave it blank and driving is allowed at every height. When the platform floor is above it, the throttle is ignored and the lift brakes to a stop. Raising and lowering still work. This limit applies on the same frame and does not wait for control latency.',
    },
    {
      title: 'Steering feel',
      detail:
        'A and D ease the front wheels toward the max steer angle. Releasing them eases the wheels back to center. With control latency at 0, that starts on the same frame as the key.',
    },
    {
      title: 'Inside and outside turning radius',
      detail:
        'The turn center sits on the rear-axle line, one turning radius to the inside. The spec-sheet comparison can use the wheel centers, the chassis corners, or the full body. Wheel centers sit at the axle ends and are spaced by the track width, which is also where the wheels are drawn. The full swept envelope is always shown too: the closest and farthest corners of the chassis and the platform, including the extension deck. Neither number changes how the lift turns.',
    },
    {
      title: 'Scissor stack',
      detail:
        'The scissors are drawn as X-braces that stretch with platform height. They are not a linkage with fixed-length arms.',
    },
    {
      title: 'Platform and extension deck',
      detail:
        'The main platform is centered on the lift origin. The extension deck adds length in the +X direction and does not move that origin.',
    },
    {
      title: 'Snap points',
      detail:
        'Front is +X and right is +Z. Chassis points sit on top of the chassis. Guardrail points follow the main platform rectangle and rise with it. The extension deck has no snap points.',
    },
    {
      title: 'Operator camera',
      detail: `The operator view is ${OPERATOR_EYE_HEIGHT_M.toFixed(2)} m above the platform floor. That eye height is a placeholder.`,
    },
    {
      title: 'Visual-only sizes',
      detail: 'Wheel size and platform deck thickness are drawn for clarity. They are not spec-sheet fields.',
    },
    {
      title: 'Collisions',
      detail:
        'Driving into an obstacle stops the lift at the last clear pose and sets speed to zero. The Scene tab lists the COLLISION line and explains the overlap test.',
    },
  ]
}
