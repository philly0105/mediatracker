'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, X, Loader2 } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import { useRouter } from 'next/navigation'

interface MultiSelectContextType {
  selectedItems: Map<string, TmdbSearchResult>
  toggleSelection: (item: TmdbSearchResult) => void
  clearSelection: () => void
  isSelectMode: boolean
}

const Context = createContext<MultiSelectContextType | null>(null)

export function MultiSelectProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<Map<string, TmdbSearchResult>>(new Map())
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isSelectMode = selectedItems.size > 0

  function toggleSelection(item: TmdbSearchResult) {
    const key = `${item.type}-${item.tmdb_id}`
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(key)) next.delete(key)
      else next.set(key, item)
      return next
    })
  }

  function clearSelection() {
    setSelectedItems(new Map())
  }

  async function handleBatchAction(action: 'watched' | 'watchlist') {
    if (selectedItems.size === 0) return
    setLoadingAction(action)
    try {
      const items = Array.from(selectedItems.values())
      const today = new Date().toISOString().split('T')[0]

      await Promise.all(
        items.map((item) => {
          if (action === 'watched') {
            return fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, watched_at: today }),
            })
          } else {
            return fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, priority: 'want_to_watch' }),
            })
          }
        })
      )
      
      // Clear after success and refresh router to update any server components
      clearSelection()
      router.refresh()
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <Context.Provider value={{ selectedItems, toggleSelection, clearSelection, isSelectMode }}>
      {children}
      
      {/* Floating Action Bar */}
      {mounted && createPortal(
        <AnimatePresence>
          {isSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 bg-black/80 backdrop-blur-xl border border-white/15 rounded-full shadow-2xl shadow-black/50"
          >
            <div className="flex items-center gap-2 pl-4 pr-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 font-bold text-xs border border-violet-500/30">
                {selectedItems.size}
              </span>
              <span className="text-sm font-semibold text-white mr-2">Selected</span>
            </div>
            
            <div className="h-6 w-px bg-white/10" />

            <button
              disabled={loadingAction !== null}
              onClick={() => handleBatchAction('watchlist')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {loadingAction === 'watchlist' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">Add to Watchlist</span>
              <span className="sm:hidden">Watchlist</span>
            </button>
            
            <button
              disabled={loadingAction !== null}
              onClick={() => handleBatchAction('watched')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {loadingAction === 'watched' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span className="hidden sm:inline">Mark as Watched</span>
              <span className="sm:hidden">Watched</span>
            </button>

            <div className="h-6 w-px bg-white/10" />

            <button
              onClick={clearSelection}
              className="p-2 rounded-full hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        </AnimatePresence>,
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
