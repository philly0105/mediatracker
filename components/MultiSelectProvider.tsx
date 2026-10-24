'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, CheckSquare, Plus, X, Loader2 } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ToastProvider'
import { poolSettled } from '@/lib/pool'
import { isAnyModalOpen } from '@/lib/useModal'

interface MultiSelectContextType {
  selectedItems: Map<string, TmdbSearchResult>
  toggleSelection: (item: TmdbSearchResult) => void
  clearSelection: () => void
  isSelectMode: boolean
  enterSelectMode: () => void
  exitSelectMode: () => void
  toggleSelectMode: () => void
  // SelectableOverlay wraps every selectable card in the app, so having each one
  // register itself is what lets the action bar offer "select all" without any
  // page needing to hand over its list.
  register: (key: string, item: TmdbSearchResult) => void
  unregister: (key: string) => void
  selectableCount: number
  selectAll: () => void
}

export function selectionKey(item: TmdbSearchResult) {
  return `${item.type}-${item.tmdb_id}`
}

const Context = createContext<MultiSelectContextType | null>(null)

export function MultiSelectProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<Map<string, TmdbSearchResult>>(new Map())
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Portals need a real document.body, absent during the server render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const [selectModeForced, setSelectModeForced] = useState(false)
  const isSelectMode = selectModeForced || selectedItems.size > 0

  const enterSelectMode = useCallback(() => {
    setSelectModeForced(true)
  }, [])

  const exitSelectMode = useCallback(() => {
    setSelectModeForced(false)
    setSelectedItems(new Map())
  }, [])

  const toggleSelectMode = useCallback(() => {
    setSelectModeForced((prev) => {
      if (prev || selectedItems.size > 0) {
        setSelectedItems(new Map())
        return false
      }
      return true
    })
  }, [selectedItems.size])

  // Escape clears a bulk selection. It lives here rather than in
  // KeyboardShortcuts because this is what holds the selection — and it defers
  // to any open modal, whose own Escape handler has the stronger claim.
  useEffect(() => {
    if (!isSelectMode) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (isAnyModalOpen()) return
      event.preventDefault()
      setSelectedItems(new Map())
      setSelectModeForced(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSelectMode])

  // Held in a ref, not state: cards mount and unmount constantly (filtering,
  // infinite scroll) and re-rendering the whole tree on each one would be
  // wasteful. Only the count is state, and only when it actually changes.
  const selectable = useRef(new Map<string, TmdbSearchResult>())
  const [selectableCount, setSelectableCount] = useState(0)

  const register = useCallback((key: string, item: TmdbSearchResult) => {
    selectable.current.set(key, item)
    setSelectableCount(selectable.current.size)
  }, [])

  const unregister = useCallback((key: string) => {
    if (selectable.current.delete(key)) setSelectableCount(selectable.current.size)
  }, [])

  const selectAll = useCallback(() => {
    setSelectedItems(new Map(selectable.current))
  }, [])

  function toggleSelection(item: TmdbSearchResult) {
    const key = selectionKey(item)
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, item)
      return next
    })
  }

  function clearSelection() {
    setSelectedItems(new Map())
    setSelectModeForced(false)
  }

  async function handleBatchAction(action: 'watched' | 'watchlist') {
    if (selectedItems.size === 0) return
    setLoadingAction(action)
    try {
      const items = Array.from(selectedItems.values())
      const today = new Date().toISOString().split('T')[0]

      // Pooled, not Promise.allSettled over the whole selection: "Select all"
      // makes the selection arbitrarily large and each write is several server
      // round-trips deep.
      const results = await poolSettled(
        items,
        5,
        async (item) => {
          if (action === 'watched') {
            const resWatch = await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, watched_at: today }),
            })
            if (!resWatch.ok) throw new Error('Failed to mark as watched')

            await fetch('/api/watchlist', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type }),
            })
          } else {
            const resWatchlist = await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, priority: 'want_to_watch' }),
            })
            if (!resWatchlist.ok) throw new Error('Failed to add to watchlist')
          }
        },
        (done, total) => setProgress({ done, total })
      )

      const succeeded = results.filter((r) => r.status === 'fulfilled').length
      const failed = results.length - succeeded
      const verb = action === 'watched' ? 'Marked' : 'Added'
      const countLabel = `${succeeded} ${succeeded === 1 ? 'item' : 'items'}`
      const suffix = action === 'watched' ? ' as watched.' : ' to your watchlist.'

      if (failed === 0) {
        toast(`${verb} ${countLabel}${suffix}`, { tone: 'success' })
      } else if (succeeded === 0) {
        toast(`Could not ${action === 'watched' ? 'mark' : 'add'} those items.`, { tone: 'error' })
      } else {
        toast(`${verb} ${countLabel} — ${failed} failed.`, { tone: 'error' })
      }

      // Clear selection and refresh the router only when at least one item succeeded.
      if (succeeded > 0) {
        clearSelection()
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAction(null)
      setProgress(null)
    }
  }

  return (
    <Context.Provider value={{
      selectedItems,
      toggleSelection,
      clearSelection,
      isSelectMode,
      enterSelectMode,
      exitSelectMode,
      toggleSelectMode,
      register,
      unregister,
      selectableCount,
      selectAll,
    }}>
      {children}
      
      {/* Floating Action Bar */}
      {mounted && isSelectMode && createPortal(
        <div
          role="toolbar"
          aria-label="Bulk actions"
          /* bottom-24 on mobile clears the fixed bottom nav, which the old
             bottom-6 sat on top of — the toast stack already gets this right.
             max-w + flex-wrap keeps five controls on a 320px screen. Centred
             with inset-x + mx-auto rather than left-1/2 + translate, which
             caps a shrink-to-fit box at half the viewport and wrapped it into
             a near-square on phones. A glass pill: it floats over the grid,
             so it is one of the few blurred surfaces on the page and the
             pill radius beats the panel's 28; the wrapped two-row bar on
             phones takes the 28 instead, since a pill that tall reads as a
             circle. */
          className="motion-toolbar-up glass-panel glass-rim fixed bottom-24 md:bottom-10 inset-x-4 mx-auto w-fit z-[100] flex flex-wrap items-center justify-center gap-2 px-2 py-1.5 max-w-[calc(100vw-2rem)] rounded-[var(--radius-2xl)] sm:rounded-[var(--radius-pill)]"
        >
          <div className="flex items-center gap-2 pl-3 pr-2">
            <span aria-hidden="true" className="tabular flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[var(--glass-chip)] shadow-[var(--glass-chip-edge)] text-[var(--accent)] font-semibold text-xs">
              {selectedItems.size}
            </span>
            <span aria-live="polite" className="tabular text-sm font-semibold text-[var(--text-primary)] mr-1">
              {progress ? `${progress.done} of ${progress.total} done` : `${selectedItems.size} selected`}
            </span>
          </div>

          <div className="h-6 w-px bg-[var(--border-soft)]" />

          {selectedItems.size < selectableCount && (
            <Button
              disabled={loadingAction !== null}
              onClick={selectAll}
              variant="ghost"
              size="sm"
            >
              <CheckSquare className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
              <span className="hidden sm:inline">Select all {selectableCount}</span>
              <span className="sm:hidden">All</span>
            </Button>
          )}

          <Button
            disabled={loadingAction !== null}
            onClick={() => handleBatchAction('watchlist')}
            variant="ghost"
            size="sm"
          >
            {loadingAction === 'watchlist' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <Plus className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
            <span className="hidden sm:inline">Add to watchlist</span>
            <span className="sm:hidden">Watchlist</span>
          </Button>

          <Button
            disabled={loadingAction !== null}
            onClick={() => handleBatchAction('watched')}
            variant="ghost"
            size="sm"
          >
            {loadingAction === 'watched' ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : <Check className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
            <span className="hidden sm:inline">Mark as watched</span>
            <span className="sm:hidden">Watched</span>
          </Button>

          <div className="h-6 w-px bg-[var(--border-soft)]" />

          <button
            onClick={clearSelection}
            aria-label="Clear selection"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)] transition-colors"
          >
            <X className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>,
        document.body
      )}
    </Context.Provider>
  )
}

export function useMultiSelect() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useMultiSelect must be used within MultiSelectProvider')
  return ctx
}

export function useOptionalMultiSelect() {
  return useContext(Context)
}
