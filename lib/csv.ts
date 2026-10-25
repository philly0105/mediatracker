// The CSV this app writes and the CSV it reads, in one place — because the two
// disagreed. `csvField` correctly RFC-4180-quotes a cell containing a newline,
// but the reader split the document into lines *before* it looked at a quote,
// so a quoted multi-line field was already torn apart by the time quote
// parsing began. Reviews are typed into a textarea, so newlines are expected
// input, and review is column 6 of 7: the entry lost every column after the
// break — status among them, so a watchlist row came back as watched — and the
// tail became a row of its own whose "title" went to TMDB's search, which
// returns something for almost any string. An unrelated film was then inserted
// into the user's watch history. Hence a scan over the whole document that
// ends a record only on a newline outside quotes.

export interface ImportRow {
  title: string
  year: string
  type: string
  rating: string
  date: string
  review: string
  status: string
}

/**
 * One cell of the export, and the only copy of the writer: the export route
 * imports it from here, and the round-trip test drives it against the reader
 * below, so the two cannot drift.
 */
export function csvField(value: string): string {
  // Leading =, +, -, @, TAB and CR are treated as formula starts by Excel/Sheets/Numbers.
  // Prefix with a tab so the cell renders safely as plain text.
  const escaped = /^[=+\-@\t\r]/.test(value) ? `\t${value}` : value
  if (/[",\n\r]/.test(escaped) || escaped !== value) {
    return `"${escaped.replace(/"/g, '""')}"`
  }
  return escaped
}

/**
 * A quoted field opened and never closed. Thrown rather than read past: once
 * newlines inside quotes are content, an unclosed quote would swallow every
 * record after it into one field, losing those rows — and if it sits in a
 * title, the merged text goes to TMDB's search, which matches something for
 * almost any string. `line` is 1-based, where the quote opened.
 */
export class UnterminatedQuoteError extends Error {
  constructor(readonly line: number) {
    super(`Unterminated quoted field starting on line ${line}`)
    this.name = 'UnterminatedQuoteError'
  }
}

/**
 * The document as records of raw fields, quotes honoured across line breaks.
 *
 * A quote opens a quoted field only at the start of that field — after
 * nothing but spaces, the way people type `a, "b, c"` by hand. Anywhere else
 * it is a literal character, as RFC 4180 has it, so a review reading
 * `He was 6'2" tall` stays one field instead of opening a quote that runs to
 * the end of the file.
 *
 * Only `\r\n` is collapsed to `\n`. Stripping every `\r` — which is what the
 * line-splitting reader did — also deletes a lone `\r` that the writer saw fit
 * to quote, and that one is the user's own text, not a line ending.
 */
export function parseCsvRecords(text: string): string[][] {
  const input = text.replace(/\r\n/g, '\n')
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let inQuotes = false
  // Whether this field has already had its quoted section. A second quote
  // after it closes (`"a"b"`) is literal, not the start of another one.
  let fieldWasQuoted = false
  let line = 1
  let quoteLine = 1

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (ch === '\n') line++
    if (inQuotes) {
      // A doubled quote is one literal quote; a lone one ends the quoted run.
      // Everything else, newlines included, is content.
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else field += ch
    } else if (ch === '"' && !fieldWasQuoted && field.trim() === '') {
      inQuotes = true
      fieldWasQuoted = true
      quoteLine = line
      field = ''
    } else if (ch === ',') {
      record.push(field)
      field = ''
      fieldWasQuoted = false
    } else if (ch === '\n') {
      record.push(field)
      records.push(record)
      record = []
      field = ''
      fieldWasQuoted = false
    } else {
      field += ch
    }
  }

  if (inQuotes) throw new UnterminatedQuoteError(quoteLine)

  // The final record carries no closing newline. A file that does end in one
  // leaves a single empty field here — that is the end of the file, not a row.
  record.push(field)
  if (record.length > 1 || record[0] !== '') records.push(record)
  return records
}

/** Import rows from an export, or from a hand-made file with the same columns. */
export function parseCSV(text: string): ImportRow[] {
  // Blank records are dropped after tokenizing, never before: a blank line
  // inside a quoted review is part of the review.
  const records = parseCsvRecords(text).filter((record) => record.some((field) => field.trim() !== ''))
  if (records.length < 2) return []

  const headers = records[0].map((h) => h.trim().toLowerCase())
  return records
    .slice(1)
    .map((vals) => {
      // The trim is load-bearing beyond tidiness: it is what cancels the
      // writer's formula-guard tab, so an exported "=1+1" imports as "=1+1".
      // The cost is that leading and trailing whitespace in a review is not
      // preserved across a round trip.
      const get = (key: string) => (vals[headers.indexOf(key)] ?? '').trim()
      return {
        title: get('title'),
        year: get('year'),
        type: get('type'),
        rating: get('rating'),
        date: get('date'),
        review: get('review'),
        status: get('status'),
      }
    })
    .filter((row) => row.title)
}
