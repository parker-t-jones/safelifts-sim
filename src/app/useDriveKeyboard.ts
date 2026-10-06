/**
 * Window key listeners for driving. Typing in a form field does not drive,
 * so W can still be used inside a text box.
 */
import { useEffect } from 'react'
import { clearHeldKeys, setKeyHeld } from './driveKeys'

const DRIVE_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyR',
  'KeyF',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
])

export function useDriveKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!DRIVE_CODES.has(event.code) || isTypingTarget(event.target)) {
        return
      }
      // Keep Space and the arrows from scrolling the page.
      event.preventDefault()
      setKeyHeld(event.code, true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      setKeyHeld(event.code, false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    // A missed keyup (for example after alt-tab) would otherwise stick forever.
    window.addEventListener('blur', clearHeldKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearHeldKeys)
      clearHeldKeys()
    }
  }, [])
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}
