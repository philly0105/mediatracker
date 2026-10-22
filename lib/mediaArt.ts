import type { SupabaseClient } from '@supabase/supabase-js'

export type MediaArt = { backdrop_url: string | null; logo_url: string | null }

// The art columns arrive with migration 014. Pages read them here, in their own
// query, instead of adding them to their main select: PostgREST rejects a select
// that names a missing column, so on a database without 014 the whole page query
// would fail. This read just comes back empty and the page renders without art.
export async function fetchMediaArt(supabase: SupabaseClient, mediaIds: string[]): Promise<Map<string, MediaArt>> {
  const art = new Map<string, MediaArt>()
  const ids = [...new Set(mediaIds)]
  if (ids.length === 0) return art

  const { data, error } = await supabase.from('media').select('id, backdrop_url, logo_url').in('id', ids)
  if (error || !data) return art

  for (const row of data as { id: string; backdrop_url: string | null; logo_url: string | null }[]) {
    art.set(row.id, { backdrop_url: row.backdrop_url ?? null, logo_url: row.logo_url ?? null })
  }
  return art
}
