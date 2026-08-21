import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MediaRow } from '@/components/ui/MediaRow'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShareFooter } from '@/components/ShareFooter'
import { Clapperboard } from 'lucide-react'
import type { SharedWatchedRow, Media } from '@/types'

// A share link's whole job is to be pasted somewhere. Without this it previewed
// in iMessage and Slack as the generic app description.
export const metadata: Metadata = {
  title: 'Shared watch history',
  description: 'A watch history shared from DorfMovies.',
  openGraph: {
    title: 'Shared watch history · DorfMovies',
    description: 'A watch history shared from DorfMovies.',
    type: 'website',
  },
  // The token in the URL is the only thing guarding this page, so keep it out
  // of search results.
  robots: { index: false, follow: false },
}

export default async function SharedWatchedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const { data: rows, error } = await supabase.rpc('shared_watched', { p_token: token })

  // Zero rows = token matches nothing (404). A valid-but-empty share returns a
  // marker row with id null, which we filter out below.
  if (error || !rows || rows.length === 0) notFound()
  const typedRows = (rows ?? []) as unknown as SharedWatchedRow[]
  const entries = typedRows.filter((r): r is SharedWatchedRow & { media: Media } => Boolean(r.media))

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow="Shared list"
        title="Watched"
        sub={entries.length === 1 ? '1 title' : `${entries.length} titles`}
      />
      {entries.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Nothing here yet."
          hint="This list is shared, but the owner has not logged anything to it."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((entry, idx: number) => (
            <MediaRow
              key={`${entry.media.id}-${entry.watched_at ?? ''}-${idx}`}
              title={entry.media.title}
              year={entry.media.release_year ?? undefined}
              type={entry.media.type}
              posterUrl={entry.media.poster_url}
              rating={entry.rating}
              watchedAt={entry.watched_at}
            />
          ))}
        </div>
      )}
      <ShareFooter />
    </div>
  )
}
