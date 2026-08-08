import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth'

// Where every emailed auth link lands: confirmation after signup, and the
// recovery link from /forgot-password.
//
// @supabase/ssr uses the PKCE flow, so the link carries a one-time `code` that
// has to be exchanged for a session server-side. The exchange writes the
// session cookies onto this response, which is why this is a route handler and
// not a page — a page could read the code but could not set the cookies.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  // Supabase reports a rejected link (expired, already used) in the query
  // string rather than by failing the request.
  const errorDescription = searchParams.get('error_description')
  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('That link is missing its code. Request a new one.')}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
