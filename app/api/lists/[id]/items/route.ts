import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { upsertMedia } from '@/lib/media'
import { parseTmdbId, parseMediaType, badRequest } from '@/lib/validation'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || typeof id !== 'string') return badRequest('Invalid list id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tmdb_id, type } = await request.json()
  const tmdbRes = parseTmdbId(tmdb_id)
  if (!tmdbRes.ok) return badRequest(tmdbRes.error)
  const typeRes = parseMediaType(type)
  if (!typeRes.ok) return badRequest(typeRes.error)

  const { media } = await upsertMedia(supabase, tmdbRes.value, typeRes.value)

  const { data, error } = await supabase
    .from('list_items')
    .upsert({ list_id: id, media_id: media.id }, { onConflict: 'list_id,media_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || typeof id !== 'string') return badRequest('Invalid list id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { media_id } = await request.json()
  if (!media_id || typeof media_id !== 'string') return badRequest('Invalid or missing media_id')

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', id)
    .eq('media_id', media_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
