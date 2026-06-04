import { createClient } from '@/lib/supabase/server'
import { fetchTmdbDetails } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  if (req.headers.get('Authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

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
      await supabase
        .from('media')
        .update({
          collection_id: details.belongs_to_collection?.id ?? null,
          collection_name: details.belongs_to_collection?.name ?? null,
        })
        .eq('id', movie.id)
      if (details.belongs_to_collection) updated++
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
