'use client'

import { Check, Square } from 'lucide-react'
import { useMultiSelect, selectionKey } from './MultiSelectProvider'
import type { TmdbSearchResult } from '@/types'
import { ReactNode, useEffect } from 'react'

export default function SelectableOverlay({ item, children }: { item: TmdbSearchResult | null, children: ReactNode }) {
  // Hooks must run before any early return — a row with a missing media join
  // would otherwise change the hook count between renders and kill the page.
  const { selectedItems, toggleSelection, isSelectMode, register, unregister } = useMultiSelect()

  // Registering here is what gives the action bar a "select all": every
  // selectable card in the app is wrapped in this component, so no page has to
  // hand its list over. Keyed on type+tmdb_id rather than the item object,
  // whose identity changes on every render at most call sites.
  const registryKey = item ? selectionKey(item) : null
  useEffect(() => {
    if (!registryKey || !item) return
    register(registryKey, item)
    return () => unregister(registryKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryKey, register, unregister])

  if (!item) return <>{children}</>

  const key = selectionKey(item)
  const isSelected = selectedItems.has(key)

  return (
    // A selected card wears the accent ring at the row radius; it is a shadow,
    // so it never changes the card's box. Posters and rows both live in grids,
    // so nothing here blurs.
    <div
      className="relative group h-full w-full rounded-[var(--radius-row)]"
      style={isSelected ? { boxShadow: 'var(--accent-ring)' } : undefined}
    >
      {/* Checkbox chip on the dark badge fill (it sits over poster art), visible
          on hover or when selected, or always visible in select mode. The chip
          draws at 36px so it stays small over a phone-width poster; the
          invisible ::after grows the hit area to 44px. */}
      <button
        type="button"
        aria-label={`Select ${item.title}`}
        aria-pressed={isSelected}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleSelection(item)
        }}
        className={`absolute top-2 left-2 z-20 flex items-center justify-center w-9 h-9 rounded-[var(--radius-thumb)] bg-[var(--glass-badge)] shadow-[var(--glass-badge-edge)] after:absolute after:-inset-1 after:content-[''] transition-[opacity,transform,color] duration-200 hover:text-[var(--text-primary)] ${
          isSelected
            ? 'text-[var(--accent)] opacity-100 scale-100'
            : isSelectMode
            ? 'text-[var(--text-secondary)] opacity-100 scale-100'
            : 'text-[var(--text-secondary)] opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 focus-visible:opacity-100 focus-visible:scale-100'
        }`}
      >
        {isSelected ? (
          <Check className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Square className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      {/* Click intercepting overlay covering the card body to prevent child clicks when select mode is active */}
      {isSelectMode && (
        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleSelection(item)
          }}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}

      {/* Dim unselected items in select mode */}
      <div className={`h-full w-full transition-[opacity,transform] duration-300 ${isSelectMode && !isSelected ? 'opacity-50 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        {children}
      </div>
    </div>
  )
}
