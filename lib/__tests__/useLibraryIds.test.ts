import { describe, it, expect } from 'vitest'
import { toIdSet } from '@/lib/useLibraryIds'

// Mirrors the module-private JoinedRow embed (object or single-element array).
type EmbedMedia = { tmdb_id: number }
type Row = { media: EmbedMedia | EmbedMedia[] | null }

describe('toIdSet', () => {
  it('normalises an object-shaped embed to a Set of ids', () => {
    const rows: Row[] = [{ media: { tmdb_id: 11 } }, { media: { tmdb_id: 22 } }]
    expect(toIdSet(rows)).toEqual(new Set([11, 22]))
  })

  it('normalises a single-element-array embed to the same Set', () => {
    const rows: Row[] = [{ media: [{ tmdb_id: 11 }] }, { media: [{ tmdb_id: 22 }] }]
    expect(toIdSet(rows)).toEqual(new Set([11, 22]))
  })

  it('produces an identical set for both embed shapes', () => {
    const objectShape = toIdSet([{ media: { tmdb_id: 5 } }, { media: { tmdb_id: 9 } }])
    const arrayShape = toIdSet([{ media: [{ tmdb_id: 5 }] }, { media: [{ tmdb_id: 9 }] }])
    expect(objectShape).toEqual(arrayShape)
  })

  it('skips null media rows', () => {
    const rows: Row[] = [{ media: null }, { media: { tmdb_id: 7 } }]
    expect(toIdSet(rows)).toEqual(new Set([7]))
  })

  it('returns an empty set for an empty or null row list', () => {
    expect(toIdSet([])).toEqual(new Set())
    expect(toIdSet(null)).toEqual(new Set())
  })
})
