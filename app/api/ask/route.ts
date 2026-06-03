import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500'

function tmdbSearch(query: string, type: 'movie' | 'show' | 'both', key: string) {
  const endpoint = type === 'movie' ? '/search/movie' : type === 'show' ? '/search/tv' : '/search/multi'
  const qs = new URLSearchParams({ api_key: key, language: 'en-US', query, page: '1' })
  return fetch(`https://api.themoviedb.org/3${endpoint}?${qs}`).then(r => r.json())
}

export async function POST(request: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY
  const tmdbKey = process.env.TMDB_API_KEY
  if (!geminiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
  if (!tmdbKey) return NextResponse.json({ error: 'Missing TMDB key' }, { status: 500 })

  const { query } = await request.json()
  if (!query?.trim()) return NextResponse.json({ error: 'No query provided' }, { status: 400 })

  const genAI = new GoogleGenerativeAI(geminiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
    systemInstruction: `Parse natural language requests about movies and TV shows. Return ONLY valid JSON:
{
  "action": "watched" | "watchlist",
  "searches": [{ "query": string, "type": "movie" | "show" | "both" }],
  "explanation": string
}
Rules:
- action: "watched" if they say watched/seen/finished/mark, else "watchlist"
- searches: one entry per title or franchise — use the canonical search term (e.g. "Star Wars" not "all star wars movies")
- For a franchise like "all Star Wars movies", use one search entry with type "movie"
- explanation: one short sentence describing what you understood`,
  })

  let parsed: { action: 'watched' | 'watchlist'; searches: { query: string; type: 'movie' | 'show' | 'both' }[]; explanation: string }
  try {
    const result = await model.generateContent(query)
    const text = result.response.text().trim()
    const json = text.startsWith('```') ? text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '') : text
    parsed = JSON.parse(json)
  } catch (e: any) {
    console.error('Gemini parse error:', e?.message ?? e)
    return NextResponse.json({ error: `AI error: ${e?.message ?? 'Unknown error'}` }, { status: 422 })
  }

  const searchResults = await Promise.all(
    parsed.searches.map(s => tmdbSearch(s.query, s.type, tmdbKey))
  )

  const seen = new Set<string>()
  const results = searchResults.flatMap((data, i) => {
    const type = parsed.searches[i].type
    return (data.results ?? []).slice(0, 8).flatMap((r: any) => {
      const inferredType = r.media_type === 'tv' || r.name ? 'show' : 'movie'
      const finalType = type === 'both' ? inferredType : type
      const key = `${finalType}-${r.id}`
      if (seen.has(key)) return []
      seen.add(key)
      return [{
        tmdb_id: r.id,
        type: finalType as 'movie' | 'show',
        title: r.title ?? r.name,
        release_year: parseInt((r.release_date ?? r.first_air_date ?? '').split('-')[0]) || null,
        poster_url: r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
        overview: r.overview ?? '',
        vote_average: r.vote_average,
      }]
    })
  })

  return NextResponse.json({ action: parsed.action, explanation: parsed.explanation, results })
}
