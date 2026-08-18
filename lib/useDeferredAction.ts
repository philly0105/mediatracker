'use client'
import { useCallback, useEffect, useRef } from 'react'

// Undo for destructive actions, done by deferring the write rather than by
// undoing it afterwards.
//
// The obvious alternative — delete immediately, then re-create on undo — cannot
// restore a watch entry faithfully: POST /api/watch refuses a duplicate unless
// you pass rewatch, so the restored row would come back with rewatch flipped.
// Deferring sidesteps that entirely; nothing has happened yet, so there is
// nothing to reconstruct.
//
// The row disappears from the UI at once and the request fires after `delayMs`
// unless cancelled. Pending work is flushed on unmount so navigating away
// commits rather than silently dropping it. A hard tab close inside the window
// loses the write — the deletion just does not stick, which is the safe way for
// this to fail.

/** How long a deferred write waits before committing. */
export const UNDO_WINDOW_MS = 6000

/**
 * How long an Undo toast stays on screen. Deliberately shorter than
 * UNDO_WINDOW_MS: if the toast outlived the window there would be a stretch
 * where Undo is visible, clickable, and already too late — which reads as a
 * broken button rather than a missed deadline.
 */
export const UNDO_TOAST_MS = UNDO_WINDOW_MS - 500

export function useDeferredAction(delayMs = UNDO_WINDOW_MS) {
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => void }>())

  const cancel = useCallback((key: string) => {
    const entry = pending.current.get(key)
    if (!entry) return false
    clearTimeout(entry.timer)
    pending.current.delete(key)
    return true
  }, [])

  const schedule = useCallback((key: string, run: () => void) => {
    // A repeat action on the same key supersedes the earlier one.
    cancel(key)
    const timer = setTimeout(() => {
      pending.current.delete(key)
      run()
    }, delayMs)
    pending.current.set(key, { timer, run })
  }, [cancel, delayMs])

  useEffect(() => {
    const map = pending.current
    return () => {
      for (const { timer, run } of map.values()) {
        clearTimeout(timer)
        run()
      }
      map.clear()
    }
  }, [])

  return { schedule, cancel }
}
