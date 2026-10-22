'use client'
import { useSyncExternalStore, type CSSProperties } from 'react'

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

// The chip itself: 22px tall, radius 6, a faint fill under a 1px ring, 12/500
// in the emphasised meta colour. It lives here rather than at each call site
// so every hint in the app is the same chip; `className` is for layout around
// it (responsive hiding, spacing), not for restyling it. The ring is a real
// border rather than the spec's inset shadow because forced colours drops
// shadows but repaints borders, so the chip keeps an edge there; the padding
// is one pixel less to put the label where the shadow version put it.
const CHIP: CSSProperties = {
  height: 22,
  padding: '0 5px',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-xs)',
  background: 'var(--glass-fill-hover)',
  alignItems: 'center',
  fontFamily: 'inherit',
  fontSize: 'var(--text-xs)',
  lineHeight: '16px',
  fontWeight: 'var(--weight-medium)',
  color: 'var(--text-strong)',
  whiteSpace: 'nowrap',
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
  // The display mode belongs to the caller: the dashboard search bar passes
  // `hidden md:inline-flex`, and a bare `inline-flex` added here would be
  // emitted after `hidden` and show the chip on phones.
  return (
    <kbd className={className ?? 'inline-flex'} style={CHIP}>
      {label}
    </kbd>
  )
}
