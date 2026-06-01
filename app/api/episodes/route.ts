import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { season_id, episode_number } = await request.json()
  const { data, error } = await supabase
    .from('episode_progress')
    .upsert(
      { user_id: user.id, season_id, episode_number, watched_at: new Date().toISOString().split('T')[0] },
      { onConflict: 'user_id,season_id,episode_number' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ progress: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { season_id, episode_number } = await request.json()
  const { error } = await supabase
    .from('episode_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('season_id', season_id)
    .eq('episode_number', episode_number)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
