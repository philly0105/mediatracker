'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { TmdbSearchResult, TmdbPersonResult } from '@/types'

export type SearchMode = 'title' | 'person'

// Shared debounced TMDB search, extracted from DashboardSearchBar so the ⌘K
// overlay gets identical request semantics without duplicating the wiring.
// Owns the query, the debounce timer, and the in-flight request. `mode` picks
// the endpoint: titles (movies/TV) or people (actors/directors).
export function useTmdbSearch(mode: SearchMode = 'title') {
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<Array<TmdbSearchResult | TmdbPersonResult>>([])
  const [loading, setLoading] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  // Read inside the debounced/async closures so a mode flip mid-query targets
  // the right endpoint without recreating the callbacks. Both used to be
  // assigned during render, which React 19 flags: a ref write during render is
  // not guaranteed to survive a discarded render pass. modeRef syncs in an
  // effect declared above the mode-change effect (effects run in declaration
  // order, so it is current by the time that one reads it); queryRef is written
  // from the event handlers that own the value, which keeps it exact.
  const modeRef = useRef(mode)
  const queryRef = useRef(query)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

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

    const typeParam = modeRef.current === 'person' ? '&type=person' : ''
    setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}${typeParam}`, {
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
    queryRef.current = value
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => search(value), 350)
  }, [search])

  // Toggling Titles/People re-runs the current query against the new endpoint
  // immediately (no debounce) so the list doesn't sit stale until the next
  // keystroke. Clear first so wrong-shaped rows never render for a frame.
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return }
    setResults([])
    if (queryRef.current.trim().length >= 2) search(queryRef.current)
  }, [mode, search])

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
    queryRef.current = ''
    setResults([])
    setLoading(false)
  }, [])

  return { query, setQuery, results, loading, clear }
}