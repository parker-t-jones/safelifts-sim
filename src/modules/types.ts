/**
 * A module is one housing with sensors fixed inside it.
 * Placement moves the whole housing. Each sensor's pose stays
 * relative to the module frame and is edited on the module, not the placement.
 *
 * Module frame: +X forward, +Y up, +Z right. With zero mount angles,
 * those axes match the chassis or platform frame the module is attached to.
 */
export interface ModuleSensor {
  id: string
  /** Shown in the editor so six identical sensors can be told apart. */
  name: string
  sensorSpecId: string
  /** Position of the sensor origin in the module frame. */
  position_m: [number, number, number]
  /**
   * Yaw, pitch, roll in degrees, applied in that order.
   * Yaw about +Y, pitch about the resulting +Z, roll about the resulting +X.
   */
  yawPitchRoll_deg: [number, number, number]
}

export interface SensorModule {
  id: string
  name: string
  /**
   * Box size along module X, Y, and Z. Drawn for the housing and, later,
   * used when the lift blocks its own sensors.
   */
  housingSize_m: [number, number, number]
  sensors: ModuleSensor[]
  notes: string
}
