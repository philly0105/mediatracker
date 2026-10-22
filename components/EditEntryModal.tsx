'use client'
import Image from 'next/image'
import React, { useId, useState } from 'react'
import RatingStars from './RatingStars'
import type { WatchEntry } from '@/types'
import { Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useModal } from '@/lib/useModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  entry: WatchEntry
  onClose: () => void
  // Client-fetched lists (LibraryView) need an explicit signal — router.refresh()
  // only re-renders server components and leaves their local state untouched.
  onSaved?: () => void
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
  color: 'var(--text-secondary)',
}

export default function EditEntryModal({ entry, onClose, onSaved }: Props) {
  const media = entry.media!
  const router = useRouter()
  const { containerRef } = useModal(onClose)
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [review, setReview] = useState(entry.review ?? '')
  const fieldId = useId()
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
      onSaved?.()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'var(--scrim)' }} onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Watch Entry"
        // The modal sheet: a short form, so it stays a centred card on phones
        // rather than the full-screen sheet the title modal takes. The modal
        // fill goes in through the token .glass-panel paints with, so the
        // reduced-transparency fallback still wins over it.
        className="dialog-in glass-panel glass-rim [--glass-panel:var(--glass-modal)] relative w-full max-w-md space-y-5 p-6 shadow-[var(--shadow-xl)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 pr-11">
          {media.poster_url && (
            <Image src={media.poster_url} alt={media.title} width={64} height={96} className="w-16 h-auto rounded-[var(--radius-thumb)] shadow-[var(--shadow-poster)]" />
          )}
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--text-lg)',
                lineHeight: '24px',
                fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
                letterSpacing: 'var(--tracking-snug)',
                color: 'var(--text-primary)',
              }}
            >
              {media.title}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}>Edit Watch Entry</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={`${fieldId}-date`} style={fieldLabel}>Date watched</label>
            <Input id={`${fieldId}-date`} type="date" value={watchedAt} onChange={e => setWatchedAt(e.target.value)} className="mt-2" />
          </div>
          <div>
            {/* RatingStars owns its own slider and the label that names it, so
                the group takes its name from the same text instead. */}
            <span id={`${fieldId}-rating-label`} style={fieldLabel}>Rating</span>
            <div role="group" aria-labelledby={`${fieldId}-rating-label`} className="mt-2">
              <RatingStars value={rating} onChange={setRating} />
            </div>
          </div>
          <div>
            <label htmlFor={`${fieldId}-review`} style={fieldLabel}>Review (optional)</label>
            <Input id={`${fieldId}-review`} multiline rows={4} value={review} onChange={e => setReview(e.target.value)} placeholder="Write your thoughts..." className="mt-2" />
          </div>
        </div>

        {error && (
          // The inset-card fill with the danger text: the rust tint it wore is
          // retired, and red on the sheet's own fill is what the tokens have.
          <p
            style={{
              margin: 0,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--glass-inset-card)',
              boxShadow: 'var(--glass-inset-card-edge)',
              fontSize: 'var(--text-sm)',
              lineHeight: '18px',
              color: 'var(--danger)',
            }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" /> : 'Save Changes'}
          </Button>
        </div>

        <Button variant="icon" aria-label="Close" onClick={onClose} className="absolute right-3 top-3">
          <X className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
