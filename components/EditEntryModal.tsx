'use client'
import { useState } from 'react'
import RatingStars from './RatingStars'
import type { WatchEntry } from '@/types'
import { Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  entry: WatchEntry
  onClose: () => void
}

const glassModal = {
  background: 'var(--surface-modal)',
  border: '1px solid rgba(255,255,255,0.1)',
}

export default function EditEntryModal({ entry, onClose }: Props) {
  const media = entry.media!
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [review, setReview] = useState(entry.review ?? '')
  const [watchedAt, setWatchedAt] = useState(entry.watched_at)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/watch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: entry.id, 
          rating, 
          review, 
          watched_at: watchedAt 
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update entry')
      }
      router.refresh()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 backdrop-blur-sm" style={{ background: 'var(--scrim)' }} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="w-full max-w-md p-6 space-y-5 rounded-[var(--radius-2xl)] relative backdrop-blur-xl" style={glassModal} onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          {media.poster_url && (
            <img src={media.poster_url} alt={media.title} className="w-16 rounded-[var(--radius-xl)] shadow-md" />
          )}
          <div>
            <h2 className="font-bold text-white text-lg">{media.title}</h2>
            <p className="text-sm text-zinc-400">Edit Watch Entry</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Date watched</label>
            <Input type="date" value={watchedAt} onChange={e => setWatchedAt(e.target.value)} className="mt-2" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Rating</label>
            <div className="mt-2"><RatingStars value={rating} onChange={setRating} /></div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Review (optional)</label>
            <Input multiline rows={4} value={review} onChange={e => setReview(e.target.value)} placeholder="Write your thoughts..." className="mt-2" />
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-400 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>

        <button onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
