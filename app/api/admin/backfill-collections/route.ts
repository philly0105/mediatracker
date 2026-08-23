import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'node:crypto'

const CONCURRENCY = 5

function isValidAdminAuth(header: string | null, secret: string): boolean {
  if (!header || !header.startsWith('Bearer ')) return false
  const token = header.slice(7)
  const a = createHash('sha256').update(token).digest()
  const b = createHash('sha256').update(secret).digest()
  return timingSafeEqual(a, b)
}

export async function POST(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin endpoints are disabled: ADMIN_SECRET is not set' }, { status: 503 })
  }
  if (!isValidAdminAuth(req.headers.get('Authorization'), adminSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // media's update policy requires auth.uid() is not null (migrations/001:118).
  // A sessionless anon client leaves auth.uid() null, so the UPDATE silently
  // matches zero rows. Surface that up front instead of reporting success that
  // never happened. Run this with a service-role client or an authenticated
  // session — the anon cookie client alone cannot write.
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.json({
      error: 'No authenticated Supabase session. media\'s update policy requires auth.uid() is not null, so this must run with a logged-in session (or a service-role client).',
    }, { status: 401 })
  }

  const { data: movies, error } = await supabase
    .from('media')
    .select('id, tmdb_id')
    .eq('type', 'movie')
    .is('collection_id', null)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const targets = movies ?? []
  let updated = 0
  const errors: string[] = []

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const chunk = targets.slice(i, i + CONCURRENCY)
    await Promise.all(chunk.map(async (movie) => {
      try {
        const details = await fetchTmdbDetails(movie.tmdb_id, 'movie')
        const { data: updatedRows, error: updateError } = await supabase
          .from('media')
          .update({
            collection_id: details.belongs_to_collection?.id ?? null,
            collection_name: details.belongs_to_collection?.name ?? null,
          })
          .eq('id', movie.id)
          .select('id')
        if (updateError) {
          errors.push(`tmdb_id=${movie.tmdb_id}: ${updateError.message}`)
        } else {
          updated += updatedRows?.length ?? 0
        }
      } catch (err) {
        errors.push(`tmdb_id=${movie.tmdb_id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }))
  }

  return NextResponse.json({
    processed: targets.length,
    updated,
    ...(errors.length > 0 ? { errors } : {}),
  })
}

