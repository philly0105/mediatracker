import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readRecentSearches,
  recordRecentSearch,
  clearRecentSearches,
  MAX_RECENT_SEARCHES,
} from '../recentSearches'

// This jsdom setup has no localStorage, so the tests install one. That is also
// the point of the guards in the module: it must degrade rather than throw.
function installStorage(): Storage {
  const map = new Map<string, string>()
  const store: Storage = {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    removeItem: (k: string) => { map.delete(k) },
    setItem: (k: string, v: string) => { map.set(k, v) },
  }
  Object.defineProperty(window, 'localStorage', { value: store, configurable: true, writable: true })
  return store
}

describe('recentSearches', () => {
  beforeEach(() => {
    installStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts empty', () => {
    expect(readRecentSearches()).toEqual([])
  })

  it('puts the newest query first', () => {
    recordRecentSearch('heat')
    recordRecentSearch('sicario')
    expect(readRecentSearches()).toEqual(['sicario', 'heat'])
  })

  // Re-running an old search should move it up, not appear twice.
  it('de-duplicates case-insensitively and promotes the repeat', () => {
    recordRecentSearch('heat')
    recordRecentSearch('sicario')
    recordRecentSearch('HEAT')

    expect(readRecentSearches()).toEqual(['HEAT', 'sicario'])
  })

  it('caps the list', () => {
    for (let i = 0; i < MAX_RECENT_SEARCHES + 4; i++) recordRecentSearch(`query ${i}`)
    const recents = readRecentSearches()

    expect(recents).toHaveLength(MAX_RECENT_SEARCHES)
    expect(recents[0]).toBe(`query ${MAX_RECENT_SEARCHES + 3}`)
  })

  // Guarding this is what keeps the palette from remembering the prefixes of one
  // search as separate entries.
  it('ignores queries shorter than two characters', () => {
    recordRecentSearch('h')
    recordRecentSearch('  ')
    expect(readRecentSearches()).toEqual([])
  })

  it('trims what it stores', () => {
    recordRecentSearch('  heat  ')
    expect(readRecentSearches()).toEqual(['heat'])
  })

  it('clears', () => {
    recordRecentSearch('heat')
    expect(clearRecentSearches()).toEqual([])
    expect(readRecentSearches()).toEqual([])
  })

  it('survives storage that throws', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError: storage is disabled') },
    })

    expect(() => readRecentSearches()).not.toThrow()
    expect(readRecentSearches()).toEqual([])
    expect(() => recordRecentSearch('heat')).not.toThrow()
  })

  it('ignores a corrupted payload', () => {
    window.localStorage.setItem('dorfmovies:recent-searches', '{"not":"an array"}')
    expect(readRecentSearches()).toEqual([])

    window.localStorage.setItem('dorfmovies:recent-searches', 'not json at all')
    expect(readRecentSearches()).toEqual([])
  })
})
