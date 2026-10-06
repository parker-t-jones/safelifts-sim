/**
 * Plain-language module and placement assumptions.
 * Each entry matches a comment next to the code that implements it.
 */
export interface ModelAssumption {
  title: string
  detail: string
}

export function moduleAssumptions(): ModelAssumption[] {
  return [
    {
      title: 'Module frame',
      detail:
        'The module origin is the center of the housing. +X is forward, +Y is up, and +Z is right. With yaw, pitch, and roll all zero, those axes match the chassis or platform frame the module is attached to.',
    },
    {
      title: 'Sensor mounts',
      detail:
        'Each sensor pose is relative to the module, not the lift. Yaw, then pitch, then roll: yaw about +Y, pitch about the resulting +Z, roll about the resulting +X. Positive yaw aims left (−Z). Positive pitch aims up. Negative pitch aims toward the ground. The sensor still looks along its own +X.',
    },
    {
      title: '6× cluster',
      detail:
        'The default template is six VL53L8CX sensors. The top row is level. The bottom row pitches −45°. In each row the left sensor yaws +45°, the center aims ahead, and the right sensor yaws −45°, so the views fan outward. Spacing and housing size are approximate until they are matched to the CAD.',
    },
    {
      title: 'One unit',
      detail:
        'A placement moves and rotates the whole module. Editing a sensor inside the template moves that sensor in every placement that uses the template.',
    },
  ]
}

export function placementAssumptions(): ModelAssumption[] {
  return [
    {
      title: 'Snap points',
      detail:
        'Choosing a snap point copies that point and attaches the module to the chassis or the platform, whichever the point belongs to. Typing a position or dragging the gizmo clears the snap. Resizing the lift does not move a module that was already placed; snap it again to follow the new corner.',
    },
    {
      title: 'Mirror',
      detail:
        'Mirror flips one placement left-to-right through the module’s forward-up plane. Sensor positions swap sides. Yaw and roll change sign. Pitch stays, so a downward sensor still looks down. The template is unchanged, which lets the right corner use the same cluster as the left.',
    },
    {
      title: 'Platform height',
      detail:
        'A platform placement lives in the platform frame, so it rises and falls with the platform. A chassis placement stays on the chassis.',
    },
    {
      title: 'Frustums',
      detail:
        'Each enabled sensor is drawn as a pyramid out to its max range. The pyramid ends on the plane at that range, so the corners are a little farther than max range. Zone rays are optional. Disabled placements keep the housing and hide the pyramids.',
    },
    {
      title: 'Module warning distance',
      detail:
        'The preview uses the slowest sensor in the module: its frames-to-confirm update periods, plus its processing latency, plus operator reaction time, plus braking at the current speed limit. It is not on the HUD. The HUD line stays the straight-line stop without the sensor wait.',
    },
  ]
}
