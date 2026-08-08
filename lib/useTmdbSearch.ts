'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { TmdbSearchResult } from '@/types'

// Shared debounced TMDB search, extracted from DashboardSearchBar so the ⌘K
// overlay gets identical request semantics without duplicating the wiring.
// Owns the query, the debounce timer, and the in-flight request.
export function useTmdbSearch() {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // The search API fetch. A query below the length threshold clears out instead
  // of hitting the network.
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    // Cancel any in-flight request before starting a new one. Without this a
    // slow early response could land after a fast later one and leave the list
    // showing results for a prefix of what was typed.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results ?? [])
      } else {
        setResults([])
      }
    } catch (err) {
      // Ignore aborts from superseded requests; log real errors.
      if ((err as Error)?.name !== 'AbortError') {
        console.error(err)
        setResults([])
      }
    } finally {
      if (abortRef.current === controller) setLoading(false)
    }
  }, [])

  // Every keystroke used to fire its own request; "breaking bad" was 12. The
  // debounce collapses a burst of keystrokes into a single fetch.
  const setQuery = useCallback((value: string) => {
    setQueryState(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => search(value), 350)
  }, [search])

  // Cancel any pending debounce/request on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  // Reset query + results, e.g. when the overlay closes.
  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    abortRef.current?.abort()
    setQueryState('')
    setResults([])
    setLoading(false)
  }, [])

  return { query, setQuery, results, loading, clear }
}