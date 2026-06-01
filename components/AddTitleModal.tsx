'use client'
import { useState } from 'react'
import RatingStars from './RatingStars'
import type { TmdbSearchResult } from '@/types'

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onSuccess: () => void
}

const glassModal = {
  background: 'rgba(13,13,15,0.85)',
  border: '1px solid rgba(255,255,255,0.1)',
}

const glassInput = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
}

export default function AddTitleModal({ item, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'watched' | 'watchlist' | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [watchedAt, setWatchedAt] = useState(new Date().toISOString().split('T')[0])
  const [priority, setPriority] = useState<'must_watch' | 'want_to_watch' | 'someday'>('want_to_watch')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      if (mode === 'watched') {
        const res = await fetch('/api/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, rating, review, watched_at: watchedAt }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tmdb_id: item.tmdb_id, type: item.type, priority }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      onSuccess()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md p-6 space-y-5 rounded-3xl relative backdrop-blur-xl" style={glassModal}>
        <div className="flex items-start gap-3">
          {item.poster_url && (
            <img src={item.poster_url} alt={item.title} className="w-16 rounded-xl" />
          )}
          <div>
            <h2 className="font-bold text-white">{item.title}</h2>
            <p className="text-sm text-zinc-400">{item.release_year} · {item.type === 'show' ? 'TV Show' : 'Movie'}</p>
          </div>
        </div>

        {!mode && (
          <div className="flex gap-3">
            <button onClick={() => setMode('watched')}
              className="flex-1 py-2.5 rounded-full text-sm font-medium transition-colors"
              style={{ background: '#ffffff', color: '#0d0d0f' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.background = '#e4e4e7')}
              onMouseLeave={e => ((e.target as HTMLElement).style.background = '#ffffff')}>
              Mark as Watched
            </button>
            <button onClick={() => setMode('watchlist')}
              className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)')}>
              Add to Watchlist
            </button>
          </div>
        )}

        {mode === 'watched' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Date watched</label>
              <input type="date" value={watchedAt} onChange={e => setWatchedAt(e.target.value)}
                className="mt-2 w-full px-4 py-2.5 rounded-full text-white text-sm focus:outline-none transition-colors"
                style={glassInput} />
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Rating (optional)</label>
              <div className="mt-2"><RatingStars value={rating} onChange={setRating} /></div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Review (optional)</label>
              <textarea value={review} onChange={e => setReview(e.target.value)}
                rows={3} placeholder="Write your thoughts..."
                className="mt-2 w-full px-4 py-2.5 rounded-2xl text-white text-sm resize-none focus:outline-none transition-colors placeholder:text-zinc-600"
                style={glassInput} />
            </div>
          </div>
        )}

        {mode === 'watchlist' && (
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Priority</label>
            <div className="mt-3 flex flex-col gap-2">
              {(['must_watch', 'want_to_watch', 'someday'] as const).map(p => (
                <label key={p} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)}
                    className="accent-white" />
                  <span className="text-sm text-white capitalize">{p.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-400 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)' }}>
            {error}
          </p>
        )}

        {mode && (
          <div className="flex gap-3 pt-1">
            <button onClick={() => setMode(null)}
              className="flex-1 py-2.5 rounded-full text-sm text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)')}>
              Back
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-40"
              style={{ background: '#ffffff', color: '#0d0d0f' }}
              onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = '#e4e4e7')}
              onMouseLeave={e => ((e.target as HTMLElement).style.background = '#ffffff')}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        <button onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors text-lg leading-none">
          ✕
        </button>
      </div>
    </div>
  )
}
