import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { getRecommendations, type TypeFilter } from '@/lib/recommendations'
import { parsePageParam } from '@/lib/validation'

// The seed query moved to lib/recommendations with the rest of the scoring; it
// is re-exported because the seed-cascade tests import it from here.
export { fetchSeeds, type SeedRow } from '@/lib/recommendations'

function parseExcludeIds(value: string | null) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id))
  )
}

function parseTypeFilter(value: string | null): TypeFilter {
  return value === 'movie' || value === 'show' ? value : 'all'
}

/** How many times Refresh has been pressed — rotates the seed window. */
function parseCycle(value: string | null) {
  const cycle = Number.parseInt(value ?? '0', 10)
  return Number.isFinite(cycle) && cycle > 0 ? cycle : 0
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const excludeIds = parseExcludeIds(searchParams.get('excludeIds'))
  const genre = searchParams.get('genre')?.trim() || null
  const type = parseTypeFilter(searchParams.get('type'))
  // A TMDB discover page underneath, so TMDB's own 500-page ceiling applies.
  const page = parsePageParam(searchParams.get('page'))
  const refresh = Boolean(searchParams.get('refresh'))
  const cycle = parseCycle(searchParams.get('cycle'))

  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json(
    await getRecommendations(supabase, user.id, { excludeIds, genre, type, page, refresh, cycle })
  )
}
