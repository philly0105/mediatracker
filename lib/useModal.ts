'use client'
import { useEffect, useRef, useId } from 'react'
import type { RefObject } from 'react'

// Module-level stack of open modal ids. The last entry is the topmost modal —
// the only one allowed to react to the keyboard, and the one that owns the
// body scroll lock. Keeping it module-scoped lets unrelated modals (and the
// global keyboard shortcuts) coordinate without prop drilling.
const stack: string[] = []
let cachedBodyOverflow: string | null = null

// Every entry excludes tabindex="-1", not just the generic one. A control the
// author took out of the tab order is not part of the ring, and treating it as
// if it were is how focus used to escape: SearchOverlay's result rows end in
// two tabindex="-1" action buttons inside an aria-hidden wrapper, so one of
// those was the ring's last element. Tab off the real last control was never
// intercepted, and Shift+Tab from the input focused an aria-hidden button —
// "aria-hidden element must not be focusable" in axe.
const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]:not([tabindex="-1"])',
].join(',')

export function isAnyModalOpen(): boolean {
  return stack.length > 0
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  // Hidden and inert nodes are not reachable either, and moving focus into an
  // aria-hidden subtree is itself a violation. The box check covers the rest
  // (a collapsed section, a display:none branch) but it needs a layout engine:
  // jsdom reports zero rects for every node, which would empty the ring and
  // disarm the trap under test, so it is only trusted when the panel itself
  // measures.
  const measurable = container.getClientRects().length > 0
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.closest('[aria-hidden="true"],[inert]') &&
      (!measurable || el.getClientRects().length > 0)
  )
}

export function useModal(onClose: () => void): { containerRef: RefObject<HTMLDivElement | null> } {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  const id = useId()

  // Keep the ref pointing at the latest callback without re-installing the
  // keydown listener. Ref updates live in an effect, never during render.
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    // Remember where focus was before this modal opened so we can return to it.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Lock body scroll. The first modal to open saves the previous value; only
    // the last modal to close restores it, so unstacking a nested modal never
    // unlocks the page while an outer modal is still open.
    const wasStacked = stack.length > 0
    stack.push(id)
    if (!wasStacked) {
      cachedBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    function handleKeyDown(event: KeyboardEvent) {
      // Only the topmost modal reacts; Escape on a covered modal is a no-op.
      if (stack[stack.length - 1] !== id) return

      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      // Read the panel at keypress time rather than capturing it: it may not
      // have existed when this effect ran.
      const container = containerRef.current
      if (event.key === 'Tab' && container) {
        trapFocus(event, container)
      }
    }

    // Focusables are queried at keypress time, not at mount: these modals load
    // their content asynchronously and the set of focusable elements changes.
    function trapFocus(event: KeyboardEvent, scope: HTMLElement) {
      const focusable = getFocusable(scope)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      // Position in the ring rather than identity against its ends. `active
      // === last` only wrapped when the DOM's last match happened to be the
      // last tabbable node; one filtered-out control after it and the real end
      // of the ring went uncaught. An index keeps the trap closed whatever a
      // consumer renders next.
      //
      // An index of -1 is the panel itself (useModal focuses it with tabindex
      // -1) or something outside the modal. Backwards that belongs at the end
      // of the ring; forwards it is left to the browser, whose next stop from
      // the panel is already the first control inside it.
      const active = document.activeElement
      const index = focusable.indexOf(active as HTMLElement)
      if (event.shiftKey) {
        if (index <= 0) {
          event.preventDefault()
          last.focus()
        }
      } else if (index === focusable.length - 1 || !scope.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      const index = stack.indexOf(id)
      if (index !== -1) stack.splice(index, 1)

      // Restore scroll only once the whole stack has closed.
      if (stack.length === 0 && cachedBodyOverflow !== null) {
        document.body.style.overflow = cachedBodyOverflow
        cachedBodyOverflow = null
      }

      // Hand focus back to whatever was focused before this modal opened.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [id])

  // Move focus into the modal once its panel actually exists. Declared AFTER the
  // effect above so that one captures the previously-focused element first —
  // otherwise this would steal focus before it was recorded, and closing would
  // restore focus to the modal instead of to whatever opened it.
  //
  // It cannot live inside that effect either: MediaInfoModal returns null until
  // its own mount flag flips, so containerRef is still null when it runs, and
  // capturing the node there leaves the trap permanently disarmed on the app's
  // main modal. No dep array, so it gets another chance after each render; the
  // ref guard makes every run after the first a no-op.
  const hasFocused = useRef(false)
  useEffect(() => {
    if (hasFocused.current) return
    const el = containerRef.current
    if (!el) return
    // The panel is not natively focusable, so give it a programmatic tabindex.
    el.tabIndex = -1
    el.focus()
    hasFocused.current = true
  })

  return { containerRef }
}