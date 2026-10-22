import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ShareFooter } from '@/components/ShareFooter'
import { SharePosterCard, SharePosterFan } from '../../SharePosterCard'
import AmbientBackdrop from '@/components/AmbientBackdrop'
import { formatDateLabel } from '@/lib/formatDate'
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
    <div>
      {/* The rows come newest first, so this is the owner's most recent watch,
          the same default the signed-in pages use. The RPC serialises the whole
          media row, so backdrop_url is simply absent until migration 014. */}
      <AmbientBackdrop src={entries[0]?.media.backdrop_url ?? null} />
      <div className="glass-panel glass-rim mb-6 p-6 md:p-7">
        <PageHeader
          className="mb-0"
          eyebrow="Shared list"
          title="Watched"
          sub={entries.length === 1 ? '1 title' : `${entries.length} titles`}
          action={<SharePosterFan posterUrls={entries.slice(0, 3).map((entry) => entry.media.poster_url)} />}
        />
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="Nothing here yet."
          hint="This list is shared, but the owner has not logged anything to it."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
          {entries.map((entry, idx: number) => (
            <SharePosterCard
              key={`${entry.media.id}-${entry.watched_at ?? ''}-${idx}`}
              title={entry.media.title}
              posterUrl={entry.media.poster_url}
              rating={entry.rating}
              caption={entry.watched_at ? formatDateLabel(entry.watched_at) : entry.media.release_year}
            />
          ))}
        </div>
      )}
      <ShareFooter />
    </div>
  )
}
