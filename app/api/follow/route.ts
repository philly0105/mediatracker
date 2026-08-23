import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'
import { parseTmdbId, badRequest } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawTmdbId = new URL(request.url).searchParams.get('tmdb_id')

  if (rawTmdbId) {
    const tmdbRes = parseTmdbId(Number(rawTmdbId))
    if (!tmdbRes.ok) return badRequest(tmdbRes.error)
    const { data: media } = await supabase
      .from('media').select('id').eq('tmdb_id', tmdbRes.value).eq('type', 'show').maybeSingle()
    if (!media) return NextResponse.json({ isFollowed: false })
    const { data } = await supabase
      .from('followed_shows').select('id').eq('user_id', user.id).eq('media_id', media.id).maybeSingle()
    return NextResponse.json({ isFollowed: !!data })
  }

  const { data, error } = await supabase
    .from('followed_shows').select('*, media(*)').eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ followed: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await request.json()
  const tmdbRes = parseTmdbId(tmdb_id)
  if (!tmdbRes.ok) return badRequest(tmdbRes.error)

  const { media } = await upsertMedia(supabase, tmdbRes.value, 'show')
  const { error } = await supabase
    .from('followed_shows')
    .upsert({ user_id: user.id, media_id: media.id }, { onConflict: 'user_id,media_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await request.json()
  const tmdbRes = parseTmdbId(tmdb_id)
  if (!tmdbRes.ok) return badRequest(tmdbRes.error)

  const { data: media } = await supabase
    .from('media').select('id').eq('tmdb_id', tmdbRes.value).eq('type', 'show').maybeSingle()
  if (!media) return NextResponse.json({ ok: true })
  await supabase.from('followed_shows').delete().eq('user_id', user.id).eq('media_id', media.id)
  return NextResponse.json({ ok: true })
}

