/**
 * Plain-language scene assumptions.
 * Each entry matches a comment next to the code that implements it.
 */
export interface ModelAssumption {
  title: string
  detail: string
}

export function sceneAssumptions(): ModelAssumption[] {
  return [
    {
      title: 'Collision',
      detail:
        'If the next pose would overlap an obstacle, the lift stays at the last clear pose and its speed goes to zero. The contacted obstacle flashes, and the list gains one COLLISION line for that approach. Touching without penetrating is not a hit, so a 32 in chassis can meet a 32 in opening. There is no physics engine.',
    },
    {
      title: 'What counts as the lift',
      detail:
        'The chassis, decks, rails, scissors, and module housings are solid. The open basket and the coverage operator are not. A header stops the rails, not the empty air inside them.',
    },
    {
      title: 'Door frames',
      detail:
        'A door frame is two jambs and a header, not a solid box, so the opening can be driven through. The door gauntlet uses clear widths of 32, 33, 34, 36, and 42 in. The clear height is 8 ft because the stowed rail top is about 2.25 m, and the test is the width.',
    },
    {
      title: 'Default sizes and reflectivity',
      detail:
        'Each type starts from an ordinary construction size. Reflectivity is an assumption: drywall 0.8, concrete 0.4, steel 0.5, wood 0.3, plastic 0.6, fabric 0.1, glass 0.1, other 0.2. Black pipe in the dark-objects scene is 0.05. Collision ignores reflectivity. Later sensing will use it.',
    },
    {
      title: 'Procedural scenes',
      detail:
        'Structure, MEP rough-in, framing, and finishes are built from the seed. Regenerate replaces the obstacles. The origin is left clear so the lift does not start inside a wall. Test scenes are fixed layouts and do not use the seed.',
    },
    {
      title: 'Imported meshes',
      detail:
        'OBJ and GLB files become an obstacle with a scale and a position. The triangles are kept for this session only, because the obstacle record has to stay plain JSON. Until a file is loaded, the obstacle is a 1 m cube times the scale. A loaded mesh is tested with its triangle bounds, which can stop the lift slightly early when the lift is rotated. Every obstacle’s triangles also go into one scene BVH for later ray casting.',
    },
  ]
}
