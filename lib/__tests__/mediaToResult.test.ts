import { describe, it, expect } from 'vitest'
import { mediaToResult } from '@/lib/mediaToResult'

const fullRow: {
  tmdb_id: number
  type: 'movie'
  title: string
  overview: string
  poster_url: string
  release_year: number
  genres: string[]
  vote_average: number
} = {
  tmdb_id: 550,
  type: 'movie',
  title: 'Fight Club',
  overview: 'A movie',
  poster_url: '/p.jpg',
  release_year: 1999,
  genres: ['Drama', 'Thriller'],
  vote_average: 8.7,
}

describe('mediaToResult', () => {
  it('maps a full Media row', () => {
    expect(mediaToResult(fullRow)).toEqual({
      tmdb_id: 550,
      type: 'movie',
      title: 'Fight Club',
      overview: 'A movie',
      poster_url: '/p.jpg',
      release_year: 1999,
      genres: ['Drama', 'Thriller'],
      vote_average: 8.7,
    })
  })

  it('coerces a null overview to an empty string', () => {
    const result = mediaToResult({ ...fullRow, overview: null })
    expect(result.overview).toBe('')
  })

  it('prefers an explicit vote_average override over the source', () => {
    const result = mediaToResult(fullRow, { vote_average: 9.0 })
    expect(result.vote_average).toBe(9.0)
  })

  it('falls back to the source vote_average when no override is given', () => {
    expect(mediaToResult(fullRow).vote_average).toBe(8.7)
  })

  it('lets a null override fall through to the source value', () => {
    expect(mediaToResult(fullRow, { vote_average: null }).vote_average).toBe(8.7)
  })

  it('leaves vote_average undefined when neither override nor source provides it', () => {
    const { vote_average, ...noRating } = fullRow
    void vote_average
    expect(mediaToResult(noRating).vote_average).toBeUndefined()
  })

  it('uses the type override (the CollectionMovieCard pattern)', () => {
    const result = mediaToResult({ ...fullRow, type: 'show' }, { type: 'movie' })
    expect(result.type).toBe('movie')
  })

  it("defaults type to 'movie' when neither override nor source has a type", () => {
    const { type, ...noType } = fullRow
    void type
    expect(mediaToResult(noType).type).toBe('movie')
  })

  it('handles a source with no genres', () => {
    const { genres, ...noGenres } = fullRow
    void genres
    const result = mediaToResult(noGenres)
    expect(result.genres).toBeUndefined()
  })
})
