import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { badRequest } from '@/lib/validation'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || typeof id !== 'string') return badRequest('Invalid list id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Record<string, unknown> = {}
  if ('name' in body) {
    if (typeof body.name !== 'string' || !body.name.trim()) return badRequest('Name cannot be empty')
    updates.name = body.name.trim()
  }
  if ('is_shared' in body) {
    if (typeof body.is_shared !== 'boolean') return badRequest('is_shared must be a boolean')
    updates.is_shared = body.is_shared
    if (body.is_shared) updates.share_token = crypto.randomUUID()
    else updates.share_token = null
  }

  const { data, error } = await supabase
    .from('lists')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ list: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id || typeof id !== 'string') return badRequest('Invalid list id')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('lists').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
