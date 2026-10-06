/**
 * Keys currently held. The drive loop reads this every frame.
 * A Set ignores key-repeat, so holding W does not stack commands.
 */
import type { DriveCommand } from '../lift/kinematics'

const held = new Set<string>()

export function setKeyHeld(code: string, isDown: boolean): void {
  if (isDown) {
    held.add(code)
  } else {
    held.delete(code)
  }
}

export function clearHeldKeys(): void {
  held.clear()
}

export function readDriveCommand(): DriveCommand {
  const forward = held.has('KeyW') || held.has('ArrowUp')
  const back = held.has('KeyS') || held.has('ArrowDown')
  const left = held.has('KeyA') || held.has('ArrowLeft')
  const right = held.has('KeyD') || held.has('ArrowRight')
  const raise = held.has('KeyR')
  const lower = held.has('KeyF')

  let throttle: DriveCommand['throttle'] = 0
  if (forward && !back) {
    throttle = 1
  } else if (back && !forward) {
    throttle = -1
  }

  // A and left arrow steer left, which is the positive steer direction.
  let steer: DriveCommand['steer'] = 0
  if (left && !right) {
    steer = 1
  } else if (right && !left) {
    steer = -1
  }

  let lift: DriveCommand['lift'] = 0
  if (raise && !lower) {
    lift = 1
  } else if (lower && !raise) {
    lift = -1
  }

  return {
    throttle,
    steer,
    lift,
    stop: held.has('Space'),
  }
}
