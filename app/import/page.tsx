'use client'
import { useState, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ImportRow {
  title: string
  year: string
  type: string
  rating: string
  date: string
  review: string
  status: string
}

interface RowResult {
  title: string
  state: 'pending' | 'success' | 'skipped' | 'error'
  matched?: string
  error?: string
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur); cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.replace(/\r/g, '').trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const vals = parseCSVRow(line)
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
  }).filter(r => r.title)
}

const TEMPLATE = `title,year,type,rating,date,review,status
The Dark Knight,2008,movie,5,2024-01-15,One of the best films ever made,watched
Inception,2010,movie,4.5,2024-02-20,,watched
Breaking Bad,2008,show,,,,watchlist
`

export default function ImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [mode, setMode] = useState<'csv' | 'watchlist'>('csv')
  const fileRef = useRef<HTMLInputElement>(null)

  function loadFile(file: File) {
    if (!file.name.endsWith('.csv')) return
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setRows(parseCSV(text))
      setResults([])
      setDone(false)
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

    for (let i = 0; i < rows.length; i++) {
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
    setImporting(false)
    setDone(true)
  }, [rows, mode])

  const completed = results.filter(r => r.state !== 'pending').length
  const succeeded = results.filter(r => r.state === 'success').length
  const skipped = results.filter(r => r.state === 'skipped').length
  const failed = results.filter(r => r.state === 'error').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-white">Import</h1>
        <div className="flex gap-2">
          <a href="/api/export"
            className="inline-flex items-center justify-center gap-2 rounded-sm text-sm font-semibold text-zinc-300 transition-all hover:bg-white/10"
            style={{ padding: '7px 14px', fontSize: 'var(--text-sm)', background: 'var(--btn-ghost-bg)', border: '1px solid var(--border-default)' }}>
            Export CSV
          </a>
          <Button onClick={downloadTemplate} variant="ghost" size="sm">
            Download template
          </Button>
        </div>
      </div>

      {/* Column guide */}
      <Card className="space-y-2">
        <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">CSV columns</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
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
              <span className="text-xs text-zinc-600">{note}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Mode toggle */}
      <div className="flex rounded-sm p-1 gap-1 w-fit" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
        {(['csv', 'watchlist'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setRows([]); setResults([]); setDone(false) }}
            className="px-4 py-1.5 rounded-sm text-sm font-semibold transition-colors"
            style={mode === m
              ? { background: 'var(--accent)', color: 'var(--bg-void)' }
              : { background: 'transparent', color: 'var(--text-secondary)' }}>
            {m === 'csv' ? 'From CSV' : 'Watchlist only'}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) loadFile(f) }}
        onClick={() => fileRef.current?.click()}
        className="rounded-lg p-10 text-center cursor-pointer transition-colors backdrop-blur-md"
        style={{
          background: dragging ? 'rgba(124, 154, 106, 0.08)' : 'rgba(255,255,255,0.02)',
          border: `1px dashed ${dragging ? 'var(--accent)' : 'var(--border-default)'}`,
        }}>
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f) }} />
        <p className="text-zinc-400 text-sm">
          {rows.length > 0
            ? <span className="text-white font-medium">{rows.length} rows loaded — click or drop to replace</span>
            : <>Drop your CSV here or <span className="text-white underline underline-offset-2">click to browse</span></>}
        </p>
      </div>

      {/* Preview table */}
      {rows.length > 0 && results.length === 0 && (
        <Card style={{ padding: 0 }} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['title', 'year', 'type', 'rating', 'date', 'status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < Math.min(rows.length, 10) - 1 ? '1px solid var(--border-faint)' : 'none' }}>
                    <td className="px-4 py-2.5 text-white font-medium truncate max-w-[180px]">{row.title}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{row.year || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{row.type || 'movie'}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{row.rating || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{row.date || '—'}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{row.status || 'watched'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 10 && (
            <p className="px-4 py-2 text-xs text-zinc-500" style={{ borderTop: '1px solid var(--border-faint)' }}>
              +{rows.length - 10} more rows
            </p>
          )}
        </Card>
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
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(completed / rows.length) * 100}%`, background: 'var(--accent)' }} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {done && (
            <Card className="flex items-center gap-4">
              <span className="text-white font-medium">{succeeded} imported</span>
              {skipped > 0 && <span className="text-zinc-500">{skipped} already existed</span>}
              {failed > 0 && <span className="text-rose-400">{failed} failed</span>}
            </Card>
          )}
          <Card style={{ padding: 0 }} className="overflow-hidden space-y-px">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border-faint)' }}>
                <span className="text-base leading-none" style={{ color: r.state === 'success' ? 'var(--green-500)' : r.state === 'skipped' ? 'var(--zinc-500)' : r.state === 'error' ? 'var(--live)' : 'var(--zinc-700)' }}>
                  {r.state === 'pending' ? '○' : r.state === 'success' ? '✓' : r.state === 'skipped' ? '–' : '✗'}
                </span>
                <span className="flex-1 text-sm" style={{ color: r.state === 'error' ? 'var(--live)' : r.state === 'success' ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {r.title}
                </span>
                {r.state === 'skipped' && (
                  <span className="text-xs text-zinc-600">already in library</span>
                )}
                {r.state === 'success' && r.matched && r.matched !== r.title && (
                  <span className="text-xs text-zinc-600">matched: {r.matched}</span>
                )}
                {r.state === 'error' && (
                  <span className="text-xs text-rose-500">{r.error}</span>
                )}
                {r.state === 'pending' && importing && (
                  <span className="text-xs text-zinc-600">waiting</span>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
