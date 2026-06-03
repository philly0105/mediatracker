import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tmdbId = new URL(request.url).searchParams.get('tmdb_id')

  if (tmdbId) {
    const { data: media } = await supabase
      .from('media').select('id').eq('tmdb_id', Number(tmdbId)).eq('type', 'show').single()
    if (!media) return NextResponse.json({ isFollowed: false })
    const { data } = await supabase
      .from('followed_shows').select('id').eq('user_id', user.id).eq('media_id', media.id).single()
    return NextResponse.json({ isFollowed: !!data })
  }

  const { data, error } = await supabase
    .from('followed_shows').select('*, media(*)').eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ followed: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await request.json()
  const { media } = await upsertMedia(supabase, tmdb_id, 'show')
  const { error } = await supabase
    .from('followed_shows')
    .upsert({ user_id: user.id, media_id: media.id }, { onConflict: 'user_id,media_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id } = await request.json()
  const { data: media } = await supabase
    .from('media').select('id').eq('tmdb_id', Number(tmdb_id)).eq('type', 'show').single()
  if (!media) return NextResponse.json({ ok: true })
  await supabase.from('followed_shows').delete().eq('user_id', user.id).eq('media_id', media.id)
  return NextResponse.json({ ok: true })
}
