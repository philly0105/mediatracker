import { describe, it, expect } from 'vitest'
import { toIdSet } from '@/lib/useLibraryIds'
import type { MediaType } from '@/types'

// Mirrors the module-private JoinedRow embed (object or single-element array).
type EmbedMedia = { tmdb_id?: number | null; type?: MediaType | null }
type Row = { media: EmbedMedia | EmbedMedia[] | null }

describe('toIdSet', () => {
  it('normalises an object-shaped embed to a Set of namespaced keys', () => {
    const rows: Row[] = [
      { media: { tmdb_id: 11, type: 'movie' } },
      { media: { tmdb_id: 22, type: 'show' } },
    ]
    expect(toIdSet(rows)).toEqual(new Set(['movie:11', 'show:22']))
  })

  it('normalises a single-element-array embed to the same Set', () => {
    const rows: Row[] = [
      { media: [{ tmdb_id: 11, type: 'movie' }] },
      { media: [{ tmdb_id: 22, type: 'show' }] },
    ]
    expect(toIdSet(rows)).toEqual(new Set(['movie:11', 'show:22']))
  })

  it('produces an identical set for both embed shapes', () => {
    const objectShape = toIdSet([
      { media: { tmdb_id: 5, type: 'movie' } },
      { media: { tmdb_id: 9, type: 'show' } },
    ])
    const arrayShape = toIdSet([
      { media: [{ tmdb_id: 5, type: 'movie' }] },
      { media: [{ tmdb_id: 9, type: 'show' }] },
    ])
    expect(objectShape).toEqual(arrayShape)
  })

  it('produces distinct keys when a movie and a show share the same tmdb_id', () => {
    const rows: Row[] = [
      { media: { tmdb_id: 1399, type: 'movie' } },
      { media: { tmdb_id: 1399, type: 'show' } },
    ]
    expect(toIdSet(rows)).toEqual(new Set(['movie:1399', 'show:1399']))
  })

  it('skips null media rows and rows missing either field', () => {
    const rows: Row[] = [
      { media: null },
      { media: { tmdb_id: 7, type: 'movie' } },
      { media: { tmdb_id: 8 } },
      { media: { type: 'show' } },
    ]
    expect(toIdSet(rows)).toEqual(new Set(['movie:7']))
  })

  it('returns an empty set for an empty or null row list', () => {
    expect(toIdSet([])).toEqual(new Set())
    expect(toIdSet(null)).toEqual(new Set())
  })
})
