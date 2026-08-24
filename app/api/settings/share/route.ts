import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { badRequest, readJson } from '@/lib/validation'

// POST: generate or revoke a share token
// body: { type: 'watched' | 'watchlist', enabled: boolean }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bodyRes = await readJson<{ type?: unknown; enabled?: unknown }>(request)
  if (!bodyRes.ok) return badRequest(bodyRes.error)

  const { type, enabled } = bodyRes.value
  if (type !== 'watched' && type !== 'watchlist') {
    return badRequest('type must be watched or watchlist')
  }

  const field = type === 'watched' ? 'watched_share_token' : 'watchlist_share_token'
  const token = enabled ? crypto.randomUUID() : null

  // .select().single() is kept so a failed upsert surfaces as an error rather
  // than a silent no-op; the returned row itself is not needed.
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, [field]: token }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token })
}
