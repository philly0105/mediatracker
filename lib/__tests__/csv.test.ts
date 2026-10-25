import { describe, it, expect } from 'vitest'
import { csvField, parseCSV, parseCsvRecords, UnterminatedQuoteError } from '@/lib/csv'

type ExportRow = {
  title: string
  year: number | ''
  type: string
  rating: number | ''
  date: string
  review: string
  status: string
}

// The export as `app/api/export/route.ts` assembles it: a header line, then
// one comma-joined line per row with title and review through csvField and the
// rest written raw. Driving the real writer is the point — a reader tested
// against hand-written CSV is exactly how the two drifted apart.
function exportCsv(rows: ExportRow[]): string {
  return [
    'title,year,type,rating,date,review,status',
    ...rows.map((row) =>
      [csvField(row.title), row.year, row.type, row.rating, row.date, csvField(row.review), row.status].join(',')
    ),
  ].join('\n')
}

describe('export → import round trip', () => {
  it('keeps a review with a newline, a comma, a quote and a leading = intact', () => {
    const review = '=SUM(A1), "best of the year", and a\nsecond line.'
    const doc = exportCsv([
      { title: 'Sinners', year: 2025, type: 'movie', rating: 5, date: '2025-04-18', review, status: 'watched' },
    ])

    expect(parseCSV(doc)).toEqual([
      { title: 'Sinners', year: '2025', type: 'movie', rating: '5', date: '2025-04-18', review, status: 'watched' },
    ])
  })

  it('does not let a multi-line review swallow the row after it', () => {
    // The reported corruption: row 1 lost its status (so a watchlist row
    // re-imported as watched) and the tail of its review became a second row
    // whose title went to TMDB's search.
    const doc = exportCsv([
      {
        title: 'Sinners', year: 2025, type: 'movie', rating: 5, date: '2025-04-18',
        review: 'Loved it.\nSecond watch was even better.', status: 'watched',
      },
      { title: 'Weapons', year: 2025, type: 'movie', rating: '', date: '', review: '', status: 'watchlist' },
    ])

    const rows = parseCSV(doc)
    expect(rows).toHaveLength(2)
    expect(rows[0].review).toBe('Loved it.\nSecond watch was even better.')
    expect(rows[0].status).toBe('watched')
    expect(rows[1]).toEqual({
      title: 'Weapons', year: '2025', type: 'movie', rating: '', date: '', review: '', status: 'watchlist',
    })
  })

  it('round-trips a title that is itself quoted and comma-laden', () => {
    const doc = exportCsv([
      { title: 'Good Night, and Good Luck', year: 2005, type: 'movie', rating: 4, date: '2024-02-02', review: 'He said "fine".', status: 'watched' },
    ])

    const [row] = parseCSV(doc)
    expect(row.title).toBe('Good Night, and Good Luck')
    expect(row.review).toBe('He said "fine".')
  })

  it('round-trips a title that starts with a formula character', () => {
    // csvField tab-prefixes it so a spreadsheet renders it as text; the
    // reader's trim takes that tab back off.
    const doc = exportCsv([
      { title: '=Tenet', year: 2020, type: 'movie', rating: '', date: '', review: '', status: 'watchlist' },
    ])
    expect(parseCSV(doc)[0].title).toBe('=Tenet')
  })

  it('does not preserve leading whitespace in a review, which the tab guard costs', () => {
    // Documented rather than fixed: csvField prefixes its guard tab to a value
    // that already starts with one, and the reader cannot tell the two apart.
    const doc = exportCsv([
      { title: 'Heat', year: 1995, type: 'movie', rating: 5, date: '2024-03-03', review: '\tindented', status: 'watched' },
    ])
    expect(parseCSV(doc)[0].review).toBe('indented')
  })
})

describe('parseCsvRecords', () => {
  it('treats a newline inside quotes as content and one outside as a record end', () => {
    expect(parseCsvRecords('a,b\n"one\ntwo",c')).toEqual([['a', 'b'], ['one\ntwo', 'c']])
  })

  it('reads CRLF line endings without leaving the carriage return behind', () => {
    expect(parseCsvRecords('a,b\r\nc,d\r\n')).toEqual([['a', 'b'], ['c', 'd']])
  })

  it('keeps a lone carriage return that the writer quoted', () => {
    // Stripping every \r mangles the user's own text; only \r\n is a line end.
    expect(parseCsvRecords('h\n"a\rb"')).toEqual([['h'], ['a\rb']])
  })

  it('unescapes doubled quotes and keeps an empty trailing field', () => {
    expect(parseCsvRecords('"say ""hi""",')).toEqual([['say "hi"', '']])
  })
})

describe('parseCSV shape handling', () => {
  it('returns nothing for a header with no rows under it', () => {
    expect(parseCSV('title,year,type,rating,date,review,status\n')).toEqual([])
  })

  it('returns nothing for an empty file', () => {
    expect(parseCSV('')).toEqual([])
  })

  it('skips blank lines and rows with no title', () => {
    const doc = 'title,status\n\nSinners,watched\n,watched\n'
    expect(parseCSV(doc)).toEqual([
      { title: 'Sinners', year: '', type: '', rating: '', date: '', review: '', status: 'watched' },
    ])
  })

  it('reads columns by header name, in whatever order they come', () => {
    const doc = 'Status,TITLE\nwatchlist,Weapons'
    expect(parseCSV(doc)[0]).toMatchObject({ title: 'Weapons', status: 'watchlist' })
  })
})

describe('stray quotes in hand-made files', () => {
  // Once newlines inside quotes are content, a quote that opens where it
  // should not swallows every record after it. These pin the two halves of
  // the guard: a quote mid-field is a literal character, and an opening quote
  // that never closes stops the import instead of being read past.

  it('keeps a quote in the middle of a review literal', () => {
    const doc = 'title,review,status\nSinners,He was 6\'2" tall,watched\nWeapons,,watchlist'
    expect(parseCSV(doc)).toEqual([
      { title: 'Sinners', year: '', type: '', rating: '', date: '', review: 'He was 6\'2" tall', status: 'watched' },
      { title: 'Weapons', year: '', type: '', rating: '', date: '', review: '', status: 'watchlist' },
    ])
  })

  it('keeps a lone quote inside a title literal', () => {
    const doc = 'title,status\nThe 12" Single,watched\nAnora,watched'
    expect(parseCSV(doc).map((r) => r.title)).toEqual(['The 12" Single', 'Anora'])
  })

  it('treats a quote after a closed quoted section as literal', () => {
    expect(parseCsvRecords('"a"b"c,d')).toEqual([['ab"c', 'd']])
  })

  it('still opens a quoted field after a space, the way people type it', () => {
    expect(parseCsvRecords('a, "b, c",d')).toEqual([['a', 'b, c', 'd']])
  })

  it('refuses a quoted field that never closes, naming the line it opened on', () => {
    const doc = 'title,review\nSinners,"Loved it\nWeapons,fine\nAnora,great'
    expect(() => parseCSV(doc)).toThrow(UnterminatedQuoteError)
    try {
      parseCSV(doc)
    } catch (err) {
      expect((err as UnterminatedQuoteError).line).toBe(2)
    }
  })
})
