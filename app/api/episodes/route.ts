import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest } from '@/lib/validation'

const MAX_EPISODES_PER_REQUEST = 500

type ParsedBody = {
  season_id: string
  episodes: number[]
  batch: boolean
}

export function parseEpisodes(body: Record<string, unknown>): ParsedBody | null {
  const season_id = typeof body.season_id === 'string' ? body.season_id.trim() : ''
  if (!season_id) return null

  const isEpisodeNo = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 10_000

  let episodes: number[] = []
  let batch = false

  if (Array.isArray(body.episodes)) {
    if (body.episodes.length > MAX_EPISODES_PER_REQUEST) return null
    episodes = body.episodes.filter(isEpisodeNo)
    batch = true
  } else if (typeof body.from === 'number' && typeof body.to === 'number') {
    const a = Math.min(body.from, body.to)
    const b = Math.max(body.from, body.to)
    if (b - a + 1 > MAX_EPISODES_PER_REQUEST) return null
    for (let e = a; e <= b; e++) {
      if (isEpisodeNo(e)) episodes.push(e)
    }
    batch = true
  } else if (isEpisodeNo(body.episode_number)) {
    episodes = [body.episode_number]
  } else {
    return null
  }

  episodes = Array.from(new Set(episodes))
  if (episodes.length === 0) return null

  return { season_id, episodes, batch }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = parseEpisodes(body)
  if (!parsed) {
    return badRequest('season_id and at least one episode required')
  }

  const watchedAt = new Date().toISOString().split('T')[0]
  const rows = parsed.episodes.map(episode_number => ({
    user_id: user.id,
    season_id: parsed.season_id,
    episode_number,
    watched_at: watchedAt,
  }))

  const { data, error } = await supabase
    .from('episode_progress')
    .upsert(rows, { onConflict: 'user_id,season_id,episode_number' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Backward compatible: a legacy single-episode body returns a single row,
  // a batch body returns an array
  const progress = parsed.batch ? (data ?? []) : data?.[0] ?? null
  return NextResponse.json({ progress }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = parseEpisodes(body)
  if (!parsed) {
    return badRequest('season_id and at least one episode required')
  }

  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('season_id', parsed.season_id)
    .in('episode_number', parsed.episodes)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}