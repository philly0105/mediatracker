import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { badRequest, parseUuid, readJson } from '@/lib/validation'

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
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<Record<string, unknown>>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const parsed = parseEpisodes(bodyRes.value)
  if (!parsed) {
    return badRequest('season_id and at least one episode required')
  }

  const seasonUuidRes = parseUuid(parsed.season_id)
  if (!seasonUuidRes.ok) return badRequest(seasonUuidRes.error)

  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('episode_count')
    .eq('id', parsed.season_id)
    .maybeSingle()

  if (seasonError) return NextResponse.json({ error: seasonError.message }, { status: 500 })
  if (!season) {
    return NextResponse.json({ error: 'Season not found' }, { status: 404 })
  }

  if (
    typeof season.episode_count === 'number' &&
    parsed.episodes.some((ep) => ep > season.episode_count)
  ) {
    return badRequest(`Episode number must be between 1 and ${season.episode_count}`)
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
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<Record<string, unknown>>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const parsed = parseEpisodes(bodyRes.value)
  if (!parsed) {
    return badRequest('season_id and at least one episode required')
  }

  const seasonUuidRes = parseUuid(parsed.season_id)
  if (!seasonUuidRes.ok) return badRequest(seasonUuidRes.error)

  // Deliberately no episode_count bound here: TMDB can revise an episode_count
  // downward, and a user must always be able to delete progress rows that now
  // sit above the new count.
  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('season_id', parsed.season_id)
    .in('episode_number', parsed.episodes)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}