import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'
import { parseTmdbId, parseMediaType, parseUuid, badRequest } from '@/lib/validation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idRes = parseUuid(id)
  if (!idRes.ok) return badRequest('Invalid list id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify list ownership before performing expensive TMDB queries and media writes
  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('id', idRes.value)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  const { tmdb_id, type } = await request.json()
  const tmdbRes = parseTmdbId(tmdb_id)
  if (!tmdbRes.ok) return badRequest(tmdbRes.error)
  const typeRes = parseMediaType(type)
  if (!typeRes.ok) return badRequest(typeRes.error)

  const { media } = await upsertMedia(supabase, tmdbRes.value, typeRes.value)

  const { data, error } = await supabase
    .from('list_items')
    .upsert({ list_id: idRes.value, media_id: media.id }, { onConflict: 'list_id,media_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idRes = parseUuid(id)
  if (!idRes.ok) return badRequest('Invalid list id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: list } = await supabase
    .from('lists')
    .select('id')
    .eq('id', idRes.value)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  const { media_id } = await request.json()
  const mediaUuidRes = parseUuid(media_id)
  if (!mediaUuidRes.ok) return badRequest('Invalid or missing media_id')

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', idRes.value)
    .eq('media_id', mediaUuidRes.value)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

