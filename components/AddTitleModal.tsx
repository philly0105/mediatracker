'use client'
import { useState } from 'react'
import RatingStars from './RatingStars'
import type { TmdbSearchResult } from '@/types'

interface Props {
  item: TmdbSearchResult
  onClose: () => void
  onSuccess: () => void
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md p-6 space-y-4 relative">
        <div className="flex items-start gap-3">
          {item.poster_url && (
            <img src={item.poster_url} alt={item.title} className="w-16 rounded" />
          )}
          <div>
            <h2 className="font-bold text-white">{item.title}</h2>
            <p className="text-sm text-gray-400">{item.release_year} · {item.type === 'show' ? 'TV Show' : 'Movie'}</p>
          </div>
        </div>

        {!mode && (
          <div className="flex gap-3">
            <button onClick={() => setMode('watched')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
              Mark as Watched
            </button>
            <button onClick={() => setMode('watchlist')} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
              Add to Watchlist
            </button>
          </div>
        )}

        {mode === 'watched' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Date watched</label>
              <input type="date" value={watchedAt} onChange={e => setWatchedAt(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Rating (optional)</label>
              <div className="mt-1"><RatingStars value={rating} onChange={setRating} /></div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide">Review (optional)</label>
              <textarea value={review} onChange={e => setReview(e.target.value)}
                rows={3} placeholder="Write your thoughts..."
                className="mt-1 w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 text-sm resize-none" />
            </div>
          </div>
        )}

        {mode === 'watchlist' && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Priority</label>
            <div className="mt-2 flex flex-col gap-2">
              {(['must_watch', 'want_to_watch', 'someday'] as const).map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} />
                  <span className="text-sm text-white capitalize">{p.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {mode && (
          <div className="flex gap-3 pt-2">
            <button onClick={() => setMode(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
              Back
            </button>
            <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>
    </div>
  )
}
