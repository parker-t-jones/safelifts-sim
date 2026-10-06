/**
 * Plain-language coverage assumptions.
 * Each entry matches a comment next to the code that implements it.
 */
export interface ModelAssumption {
  title: string
  detail: string
}

export function coverageAssumptions(): ModelAssumption[] {
  return [
    {
      title: 'Danger shell',
      detail:
        'Samples sit on a grid in the lift frame, outside the chassis, decks, basket, rails, scissors, module housings, and the operator. A point is kept when it is within the shell distance of that outline, or in the overhead column above the rails. The floor cuts the shell off at Y = 0. Coverage does not look at the site, and it does not change when the lift drives or yaws.',
    },
    {
      title: 'Shell grows with the warning distance',
      detail:
        'The shell you type is the minimum. If the worst-case warning distance plus 0.25 m is longer, the shell grows to that and the panel says so. Worst case uses the speed limit and brake rate at the height being checked, plus the slowest enabled sensor (its frames-to-confirm periods and processing latency). The overhead column does not grow.',
    },
    {
      title: 'In time and too late',
      detail:
        'The warning distance is how far the lift travels during the sensor delay, then reaction, then braking. Too late means that sample is inside the warning distance, so a detection there would not leave room to stop. In time means it is farther than that, out to the shell edge. The headline is that in-time share. Every region uses the same split, including the sides, the overhead column, and the floor ring.',
    },
    {
      title: 'Regions',
      detail:
        'Front, rear, left, and right follow the nearest outer face. Floor near the chassis is everything at or below the chassis top, outside the chassis footprint. Overhead is the column above the main platform and the extension, up to the overhead clearance. The open gap around the scissors is counted with the side it faces, or with the floor when it is that low.',
    },
    {
      title: 'Grid',
      detail:
        'The default spacing is 5 cm. Fine is 2.5 cm. A coarser spacing is allowed and finishes faster. The finest spacing is 2.5 cm. A gap tighter than one cell, such as an inch of doorway clearance, is left to the lasers and the door-gauntlet scene.',
    },
    {
      title: 'Self-occlusion',
      detail:
        'A sample counts as covered only when a ray from a sensor reaches it. A hit on the chassis, a deck, a rail, the scissors, or a module housing is self-occlusion, even if that placement is disabled. Those points are not called uncovered, and they are not called covered. The sensor’s own housing is ignored for the first few centimeters so the mount does not block itself.',
    },
    {
      title: 'Operator',
      detail:
        'The operator is a stack of three boxes, 1.75 m tall unless you change it. You can shift it forward and to the right of the platform center. A sensor is flagged when it can see that person. Drawing the body also blocks coverage samples behind it. The body is not part of the shell outline.',
    },
    {
      title: 'Scissors and rails',
      detail:
        'The scissors are the same three-bay X as the drawing, not a real linkage. The rails match the drawn posts and top bars, including the extension. The basket interior is left out of the sample grid. Rays can still pass through the open top and the gaps between bars.',
    },
    {
      title: 'Height chart',
      detail:
        'Stowed, the elevated threshold, and max height use the spacing you picked. The curve between them uses a 10 cm grid, or your spacing if that is already coarser, so the chart does not repeat the fine grid at every height.',
    },
  ]
}
