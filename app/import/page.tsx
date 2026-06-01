'use client'
import { useState, useRef, useCallback } from 'react'

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

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

const pillInput = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
}

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
    a.href = url; a.download = 'mediatracker-template.csv'; a.click()
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
  }, [rows])

  const completed = results.filter(r => r.state !== 'pending').length
  const succeeded = results.filter(r => r.state === 'success').length
  const skipped = results.filter(r => r.state === 'skipped').length
  const failed = results.filter(r => r.state === 'error').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Import</h1>
        <div className="flex gap-2">
          <a href="/api/export"
            className="px-4 py-2 rounded-full text-sm text-zinc-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.11)')}
            onMouseLeave={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}>
            Export CSV
          </a>
          <button onClick={downloadTemplate}
            className="px-4 py-2 rounded-full text-sm text-zinc-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.11)')}
            onMouseLeave={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}>
            Download template
          </button>
        </div>
      </div>

      {/* Column guide */}
      <div className="rounded-2xl p-4 space-y-2 backdrop-blur-md" style={glassCard}>
        <p className="text-xs text-zinc-500 uppercase tracking-wider">CSV columns</p>
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
              <code className="text-xs text-orange-400">{col}</code>
              <span className="text-xs text-zinc-600">{note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-full p-1 gap-1 w-fit" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        {(['csv', 'watchlist'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setRows([]); setResults([]); setDone(false) }}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={mode === m
              ? { background: '#ffffff', color: '#0d0d0f' }
              : { background: 'transparent', color: '#71717a' }}>
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
        className="rounded-2xl p-10 text-center cursor-pointer transition-colors backdrop-blur-md"
        style={{
          background: dragging ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${dragging ? 'rgba(249,115,22,0.4)' : 'rgba(255,255,255,0.08)'}`,
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
        <div className="rounded-2xl overflow-hidden backdrop-blur-md" style={glassCard}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  {['title', 'year', 'type', 'rating', 'date', 'status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-zinc-500 uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < Math.min(rows.length, 10) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
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
            <p className="px-4 py-2 text-xs text-zinc-600" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              +{rows.length - 10} more rows
            </p>
          )}
        </div>
      )}

      {/* Import button */}
      {rows.length > 0 && !done && (
        <div className="flex items-center gap-4">
          <button onClick={runImport} disabled={importing}
            className="px-6 py-2.5 rounded-full font-medium text-sm transition-colors disabled:opacity-40"
            style={{ background: '#ffffff', color: '#0d0d0f' }}
            onMouseEnter={e => !importing && ((e.target as HTMLElement).style.background = '#e4e4e7')}
            onMouseLeave={e => ((e.target as HTMLElement).style.background = '#ffffff')}>
            {importing
              ? `Importing ${completed}/${rows.length}...`
              : `${mode === 'watchlist' ? 'Add to watchlist' : 'Import'} ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`}
          </button>
          {importing && (
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${(completed / rows.length) * 100}%`, background: '#f97316' }} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {done && (
            <div className="rounded-2xl p-4 flex items-center gap-4 backdrop-blur-md" style={glassCard}>
              <span className="text-white font-medium">{succeeded} imported</span>
              {skipped > 0 && <span className="text-zinc-500">{skipped} already existed</span>}
              {failed > 0 && <span className="text-rose-400">{failed} failed</span>}
            </div>
          )}
          <div className="rounded-2xl overflow-hidden backdrop-blur-md space-y-px" style={glassCard}>
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5"
                style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <span className="text-base leading-none" style={{ color: r.state === 'success' ? '#4ade80' : r.state === 'skipped' ? '#71717a' : r.state === 'error' ? '#fb7185' : '#3f3f46' }}>
                  {r.state === 'pending' ? '○' : r.state === 'success' ? '✓' : r.state === 'skipped' ? '–' : '✗'}
                </span>
                <span className="flex-1 text-sm" style={{ color: r.state === 'error' ? '#fb7185' : r.state === 'success' ? '#a3a3a3' : '#52525b' }}>
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
          </div>
        </div>
      )}
    </div>
  )
}
