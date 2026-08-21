'use client'
import { useSyncExternalStore } from 'react'

// The platform never changes for the life of the page, so there is nothing to
// subscribe to — this is useSyncExternalStore purely for its server/client
// snapshot split, which is what keeps hydration clean. The server snapshot is
// the Mac glyph and the client snapshot is the real answer, so hydration
// matches and the correction lands in the same commit. Rendering nothing until
// mount would instead reflow the sidebar and the dashboard search bar.
const noSubscribe = () => () => {}

export function useIsMac() {
  return useSyncExternalStore(
    noSubscribe,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent),
    () => true,
  )
}

interface KbdProps {
  /** The non-modifier part of the chord, e.g. `K` or `↵`. */
  keys: string
  /** Prefix the platform's primary modifier (⌘ / Ctrl). */
  mod?: boolean
  className?: string
}

/**
 * A keyboard hint that names the modifier the user's platform actually uses.
 * Every call site hardcoded ⌘ even though `KeyboardShortcuts.tsx` has always
 * accepted `metaKey || ctrlKey`, so Windows and Linux users were shown a key
 * their keyboard does not have.
 */
export function Kbd({ keys, mod = true, className }: KbdProps) {
  const isMac = useIsMac()
  // ⌘ sits flush against the key; "Ctrl" is a word and needs the space.
  const label = mod ? (isMac ? `⌘${keys}` : `Ctrl ${keys}`) : keys
  return <kbd className={className}>{label}</kbd>
}
