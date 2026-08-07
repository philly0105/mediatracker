import { createClient } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  // Without this, an unset ADMIN_SECRET makes the expected header the literal
  // string "Bearer undefined", which anyone can send.
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin endpoints are disabled: ADMIN_SECRET is not set' }, { status: 503 })
  }
  if (req.headers.get('Authorization') !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // media's update policy requires auth.uid() is not null (migrations/001:118).
  // A sessionless anon client leaves auth.uid() null, so the UPDATE silently
  // matches zero rows. Surface that up front instead of reporting success that
  // never happened. Run this with a service-role client or an authenticated
  // session — the anon cookie client alone cannot write.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({
      error: 'No authenticated Supabase session. This route writes media rows via the anon client, which cannot satisfy the "auth.uid() is not null" update policy. Run it with a service-role key or an authenticated session.',
    }, { status: 500 })
  }

  const { data: movies, error } = await supabase
    .from('media')
    .select('id, tmdb_id')
    .eq('type', 'movie')
    .is('collection_id', null)
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  const errors: string[] = []

  for (const movie of (movies ?? [])) {
    try {
      const details = await fetchTmdbDetails(movie.tmdb_id, 'movie')
      // Count rows the UPDATE actually touched (via RETURNING), not the TMDB
      // payload, so the report reflects what was written to the DB.
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
    } catch (err: any) {
      errors.push(`tmdb_id=${movie.tmdb_id}: ${err.message}`)
    }
  }

  return NextResponse.json({
    processed: movies?.length ?? 0,
    updated,
    ...(errors.length > 0 ? { errors } : {}),
  })
}
