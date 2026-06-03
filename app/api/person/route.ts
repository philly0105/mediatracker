import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // Search TMDB for the person's photo
  let profileUrl = null
  try {
    const tmdbKey = process.env.TMDB_API_KEY
    if (tmdbKey) {
      const qs = new URLSearchParams({ api_key: tmdbKey, query: name })
      const res = await fetch(`https://api.themoviedb.org/3/search/person?${qs}`)
      if (res.ok) {
        const data = await res.json()
        if (data.results && data.results.length > 0 && data.results[0].profile_path) {
          profileUrl = `https://image.tmdb.org/t/p/w500${data.results[0].profile_path}`
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch person from TMDB', err)
  }

  // Fetch watch history containing this person
  // We need to fetch all media and filter in memory, or use Supabase array syntax
  // PostgREST syntax for text array contains is `.cs.{val}`
  // Because it's an inner join, we can't easily do an OR on the joined table in the select string directly without advanced syntax.
  // Instead, let's fetch all watch entries and filter in memory since user history is small, 
  // or use the correct PostgREST syntax: `media!inner(*)` and then `.or(`media.director.eq.${name},media.cast_members.cs.{${name}}`)`
  // Actually, Supabase JS syntax for OR with joined tables is tricky. Let's just fetch all and filter in memory for simplicity.
  const { data: entries, error } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const filtered = (entries || []).filter((entry: any) => {
    if (!entry.media) return false
    const m = entry.media
    if (m.director === name) return true
    if (m.cast_members && m.cast_members.includes(name)) return true
    return false
  })

  return NextResponse.json({ entries: filtered, profile_url: profileUrl })
}
