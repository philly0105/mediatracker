import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: generate or revoke a share token
// body: { type: 'watched' | 'watchlist', enabled: boolean }
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, enabled } = await request.json()
  if (type !== 'watched' && type !== 'watchlist') {
    return NextResponse.json({ error: 'type must be watched or watchlist' }, { status: 400 })
  }

  const field = type === 'watched' ? 'watched_share_token' : 'watchlist_share_token'
  const token = enabled ? crypto.randomUUID() : null

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, [field]: token }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token })
}
