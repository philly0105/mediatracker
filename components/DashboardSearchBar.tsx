'use client'
import type { CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { openSearchOverlay } from '@/lib/searchOverlayBus'

/**
 * The header's "Log a watch" pill. It opens the same ⌘K search overlay the
 * old search bar did; the shortcut's hint lives on the sidebar's search
 * field, as in the reference. A flat fill rather than a blurred one: a button
 * is not a tier-1 surface, and the pill sits over the ambient layer, which is
 * already blurred. Forced colours drop the fill and edge, so it draws a
 * border there.
 */
export default function DashboardSearchBar() {
  return (
    <button
      type="button"
      onClick={openSearchOverlay}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--glass-fill-selected)] text-[var(--text-primary)] transition-colors hover:bg-[var(--btn-ghost-bg-hover)] forced-colors:border forced-colors:border-[color:ButtonText]"
      style={{
        height: 44,
        padding: '0 16px 0 14px',
        boxShadow: 'var(--glass-btn-edge)',
        fontSize: 'var(--text-base)',
        lineHeight: '20px',
        fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
        letterSpacing: 'var(--tracking-text)',
        whiteSpace: 'nowrap',
      }}
    >
      <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
      Log a watch
    </button>
  )
}
