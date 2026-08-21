'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

// Debounce for free-text keys (those that default to ''): typing shouldn't
// rewrite the URL — and churn the router's client cache — on every keystroke,
// so the write is held until the user pauses. State still updates immediately;
// only the URL mirror is delayed.
const FREE_TEXT_DEBOUNCE_MS = 350

// Serialise the current values into a query string, dropping any param that is
// still at its default (or that isn't tracked at all) so URLs stay clean —
// /movies, not /movies?q=&sort=recent&rating=All&... — and a shared link only
// carries the filters that actually differ. Exported pure so this exact
// construction is unit testable without a router.
export function buildQueryString(
  values: Record<string, string>,
  defaults: Record<string, string>
): string {
  const params = new URLSearchParams()
  for (const key of Object.keys(defaults)) {
    const value = values[key]
    if (value === undefined || value === defaults[key]) continue
    params.set(key, value)
  }
  return params.toString()
}

// Central hook for mirroring per-page filter state into the URL. State remains
// the source of truth; the URL is a read-only mirror that makes a view
// bookmarkable and survivable across reloads.
//
// `defaults` maps each tracked key to its fallback value. A key whose default
// is '' is treated as free text and its URL write is debounced (e.g. Library's
// `q`); every other key is written to the URL immediately. Values are read from
// `useSearchParams()` on mount so a bookmarked URL shows its filters on first
// paint; the caller is responsible for validating enumerated options.
export function useUrlFilters(defaults: Record<string, string>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // One lazy state object keeps the read loop behind a single initialiser —
  // hooks can't be called in a loop, so each key falls into the same object.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const key of Object.keys(defaults)) {
      initial[key] = searchParams.get(key) ?? defaults[key]
    }
    return initial
  })

  // Track the latest values outside render so setValue can build the next URL
  // from the just-updated map rather than a stale closure. Only setValue ever
  // changes the map, so keeping the ref in sync there (not during render) is
  // enough.
  const valuesRef = useRef(values)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const writeUrl = useCallback(
    (next: Record<string, string>) => {
      const qs = buildQueryString(next, defaults)
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [defaults, pathname, router]
  )

  const setValue = useCallback(
    (key: string, value: string) => {
      const next = { ...valuesRef.current, [key]: value }
      valuesRef.current = next
      setValues(next)

      // Free-text keys debounce the URL write; everything else is written
      // right away so the selected filter is reflected in the URL immediately.
      if (defaults[key] === '') {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        // Read the ref at fire time, not `next` from this closure: another key
        // may change during the debounce window, and replaying this closure's
        // snapshot would clobber that newer value in the URL.
        debounceRef.current = setTimeout(() => writeUrl(valuesRef.current), FREE_TEXT_DEBOUNCE_MS)
      } else {
        writeUrl(next)
      }
    },
    [defaults, writeUrl]
  )

  // Put a set of keys back to their defaults in one pass. Looping setValue
  // instead would fire one router.replace per key, and each intermediate URL
  // would land in history. `keys` defaults to every tracked key.
  const reset = useCallback(
    (keys?: string[]) => {
      const next = { ...valuesRef.current }
      for (const key of keys ?? Object.keys(defaults)) next[key] = defaults[key]
      valuesRef.current = next
      setValues(next)
      // A free-text debounce still in flight would fire after this write and
      // put the cleared query straight back into the URL.
      if (debounceRef.current) clearTimeout(debounceRef.current)
      writeUrl(next)
    },
    [defaults, writeUrl]
  )

  // Don't write the URL after the page unmounts with a pending debounce.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return [values, setValue, reset] as const
}