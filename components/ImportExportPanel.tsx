'use client'
import { useState, useCallback, type CSSProperties } from 'react'
import { Download, Upload, Check, Minus, X, Circle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { parseCSV, type ImportRow } from '@/lib/csv'

interface RowResult {
  title: string
  state: 'pending' | 'success' | 'skipped' | 'error'
  matched?: string
  error?: string
}

const NOT_CSV = 'That needs to be a .csv file. Download the template if you need the right shape.'
const NO_ROWS = 'We read that file but found no rows. It needs a header line and a "title" column — the template shows the shape.'
const UNREADABLE = "That file couldn't be read. Try choosing it again."

const TEMPLATE = `title,year,type,rating,date,review,status
The Dark Knight,2008,movie,5,2024-01-15,One of the best films ever made,watched
Inception,2010,movie,4.5,2024-02-20,,watched
Breaking Bad,2008,show,,,,watchlist
`

const CARD_TITLE: CSSProperties = {
  margin: 0,
  fontSize: 'var(--text-md)',
  lineHeight: '24px',
  fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
  letterSpacing: 'var(--tracking-text)',
  color: 'var(--text-primary)',
}

const META: CSSProperties = {
  margin: '2px 0 0',
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  color: 'var(--text-secondary)',
}

// Per-row outcome: the lucide glyph, its colour, and the name a screen reader
// gets for it (the glyph is the only status a successful row carries).
const RESULT_STATE: Record<RowResult['state'], { icon: typeof Check; color: string; label: string }> = {
  pending: { icon: Circle, color: 'var(--text-faint)', label: 'Pending' },
  success: { icon: Check, color: 'var(--accent)', label: 'Imported' },
  skipped: { icon: Minus, color: 'var(--text-muted)', label: 'Skipped' },
  error: { icon: X, color: 'var(--danger)', label: 'Failed' },
}

export default function ImportExportPanel() {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mode, setMode] = useState<'csv' | 'watchlist'>('csv')
  const [fileError, setFileError] = useState<string | null>(null)

  // Every way out of here now says something. A rejected extension used to
  // return in silence, which on screen is indistinguishable from a file that
  // loaded and held nothing; a read failure did not even have a handler. The
  // extension test is lowercased because a .CSV off a Windows share is still
  // a CSV, and the file input's own `accept` already matches it either way.
  function loadFile(file: File) {
    setResults([])
    setDone(false)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setRows([])
      setFileError(NOT_CSV)
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(String(e.target?.result ?? ''))
      setRows(parsed)
      setFileError(parsed.length === 0 ? NO_ROWS : null)
    }
    reader.onerror = () => {
      setRows([])
      setFileError(UNREADABLE)
    }
    reader.readAsText(file)
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'dorfmovies-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const runImport = useCallback(async () => {
    setImporting(true)
    setDone(false)
    setResults(rows.map(r => ({ title: r.title, state: 'pending' })))

    const CONCURRENCY = 5
    let currentIndex = 0

    async function worker() {
      while (true) {
        const i = currentIndex++
        if (i >= rows.length) break

        try {
          const res = await fetch('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mode === 'watchlist' ? { ...rows[i], status: 'watchlist' } : rows[i]),
          })
          const data = await res.json()
          setResults(prev => prev.map((r, j) =>
            j === i
              ? res.ok
                ? data.skipped
                  ? { ...r, state: 'skipped' }
                  : { ...r, state: 'success', matched: data.matched }
                : { ...r, state: 'error', error: data.error }
              : r
          ))
        } catch {
          setResults(prev => prev.map((r, j) =>
            j === i ? { ...r, state: 'error', error: 'Network error' } : r
          ))
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, rows.length) }, () => worker())
    await Promise.all(workers)

    setImporting(false)
    setDone(true)
  }, [rows, mode])

  const completed = results.filter(r => r.state !== 'pending').length
  const succeeded = results.filter(r => r.state === 'success').length
  const skipped = results.filter(r => r.state === 'skipped').length
  const failed = results.filter(r => r.state === 'error').length

  return (
    <div className="space-y-3">
      {/* Export. Rows inside a panel are the flat tier-2 fill; the hover
          brightening is for clickable rows, and these two are not. */}
      <Card variant="row" className="hover:bg-[var(--glass-card)] flex items-start justify-between gap-4 flex-wrap" style={{ padding: 16 }}>
        <div className="min-w-0">
          <h3 style={CARD_TITLE}>Export library</h3>
          <p style={META}>
            Download your watched history and watchlist as a CSV file.
          </p>
        </div>
        <a
          href="/api/export"
          className="btn glass-btn inline-flex items-center justify-center gap-2 shrink-0 text-[var(--text-primary)]"
          style={{ padding: '0 14px', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'] }}
        >
          <Download className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
          Export CSV
        </a>
      </Card>

      {/* Import */}
      <Card variant="row" className="hover:bg-[var(--glass-card)] space-y-5" style={{ padding: 16 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 style={CARD_TITLE}>Import from CSV</h3>
            <p style={META}>
              Bulk-add watched entries or watchlist items from a CSV file.
            </p>
          </div>
          <Button onClick={downloadTemplate} variant="secondary" size="sm">
            Download template
          </Button>
        </div>

        {/* Column guide */}
        <div className="space-y-2">
          <p style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'], color: 'var(--text-muted)' }}>CSV columns</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
            {[
              { col: 'title', note: 'required' },
              { col: 'year', note: 'optional — improves matching' },
              { col: 'type', note: '"movie" or "show" (default: movie)' },
              { col: 'rating', note: '1–5, half stars ok (optional)' },
              { col: 'date', note: 'YYYY-MM-DD watched date (optional)' },
              { col: 'review', note: 'optional text' },
              { col: 'status', note: '"watched" or "watchlist" (default: watched)' },
            ].map(({ col, note }) => (
              <div key={col} className="flex gap-2 items-baseline">
                <code className="text-xs text-[var(--accent)] font-mono">{col}</code>
                <span className="text-xs text-[var(--text-muted)]">{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <SegmentedControl
          options={[
            { id: 'csv', label: 'From CSV' },
            { id: 'watchlist', label: 'Watchlist only' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m)
            setRows([])
            setResults([])
            setDone(false)
            setFileError(null)
          }}
          size="sm"
        />

        {/* Drop zone */}
        {/* A <label> rather than a click-handling div: the input stays a real
            focusable file input (sr-only, not `hidden`, which would drop it out
            of the tab order and the a11y tree), so the picker opens from the
            keyboard as well as the pointer. No onClick — clicking the label
            already activates the input, and both would open two pickers. The
            global outline cannot land on the sr-only input, so the well keeps
            an outer focus-within ring of its own (nothing clips the label, so
            the ring stays visible). */}
        <label
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
          className="glass-inset relative block p-8 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-[var(--border-focus)]"
          style={{
            background: dragging ? 'var(--green-tint-bg)' : undefined,
            border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border-default)'}`,
          }}>
          <input type="file" accept=".csv" className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
          <Upload className="w-5 h-5 mx-auto mb-2" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm text-[var(--text-secondary)]">
            {rows.length > 0
              ? <span className="text-[var(--text-primary)] font-medium">{rows.length} rows loaded — click or drop to replace</span>
              : <>Drop your CSV here or <span className="text-[var(--text-primary)] underline underline-offset-2">click to browse</span></>}
          </p>
        </label>

        {/* The drop zone's own copy only ever reports success, so a rejected
            or unreadable file says so here. `alert` rather than `status`: it
            is the answer to something the user just did. */}
        {fileError && (
          <p role="alert" className="text-sm" style={{ margin: 0, color: 'var(--danger)' }}>
            {fileError}
          </p>
        )}

        {/* Preview table */}
        {rows.length > 0 && results.length === 0 && (
          <div className="glass-inset overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-divider)' }}>
                    {['title', 'year', 'type', 'rating', 'date', 'status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-[var(--text-muted)] font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < Math.min(rows.length, 10) - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                      <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium truncate max-w-[180px]">{row.title}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.year || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.type || 'movie'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.rating || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.date || '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-secondary)]">{row.status || 'watched'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 10 && (
              <p className="px-4 py-2 text-xs text-[var(--text-muted)]" style={{ borderTop: '1px solid var(--border-faint)' }}>
                +{rows.length - 10} more rows
              </p>
            )}
          </div>
        )}

        {/* Import button */}
        {rows.length > 0 && !done && (
          <div className="flex items-center gap-4">
            <Button onClick={runImport} disabled={importing}>
              {importing
                ? `Importing ${completed}/${rows.length}...`
                : `${mode === 'watchlist' ? 'Add to watchlist' : 'Import'} ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`}
            </Button>
            {importing && (
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--progress-track)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(completed / rows.length) * 100}%`, background: 'var(--accent)' }} />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            {done && (
              <div className="flex items-center gap-4 text-sm tabular">
                <span className="text-[var(--text-primary)] font-medium">{succeeded} imported</span>
                {skipped > 0 && <span className="text-[var(--text-muted)]">{skipped} already existed</span>}
                {failed > 0 && <span style={{ color: 'var(--danger)' }}>{failed} failed</span>}
              </div>
            )}
            <div className="glass-inset overflow-hidden">
              {results.map((r, i) => {
                const { icon: Icon, color, label } = RESULT_STATE[r.state]
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                    style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                    <span role="img" aria-label={label} className="inline-flex shrink-0" style={{ color }}>
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 text-sm" style={{ color: r.state === 'error' ? 'var(--danger)' : r.state === 'success' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {r.title}
                    </span>
                    {r.state === 'skipped' && (
                      <span className="text-xs text-[var(--text-muted)]">already in library</span>
                    )}
                    {r.state === 'success' && r.matched && r.matched !== r.title && (
                      <span className="text-xs text-[var(--text-muted)]">matched: {r.matched}</span>
                    )}
                    {r.state === 'error' && (
                      <span className="text-xs" style={{ color: 'var(--danger)' }}>{r.error}</span>
                    )}
                    {r.state === 'pending' && importing && (
                      <span className="text-xs text-[var(--text-muted)]">waiting</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
