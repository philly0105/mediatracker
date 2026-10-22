'use client'
import type { CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { openSearchOverlay } from '@/lib/searchOverlayBus'
import { Kbd } from '@/components/ui/Kbd'

/**
 * The header's "Log a watch" pill. It opens the same ⌘K search overlay the
 * old search bar did; the keyboard hint stays so the shortcut is still
 * discoverable. A flat fill rather than a blurred one: a button is not a
 * tier-1 surface, and the pill sits over the ambient layer, which is already
 * blurred.
 */
export default function DashboardSearchBar() {
  return (
    <button
      type="button"
      onClick={openSearchOverlay}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--glass-fill-selected)] text-[var(--text-primary)] transition-colors hover:bg-[var(--btn-ghost-bg-hover)]"
      style={{
        height: 44,
        padding: '0 12px 0 14px',
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
      <Kbd keys="K" />
    </button>
  )
}
