import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// /reset-password is deliberately absent: it is reached with a real session,
// the one /auth/callback mints from the emailed recovery code, so the normal
// gate is what stops anyone else from loading it.
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/auth/callback', '/share']

// Signed in already, so these three have nothing to offer. /auth/callback is
// not among them — following a confirmation link while signed in as someone
// else has to be able to complete the exchange.
const SIGNED_OUT_ONLY = ['/login', '/signup', '/forgot-password']

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname
    const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))
    const isApi = path.startsWith('/api')

    if (!user && !isPublic) {
      if (isApi) {
        const unauthResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        supabaseResponse.cookies.getAll().forEach(c => unauthResponse.cookies.set(c))
        return unauthResponse
      }
      const redirectToLogin = NextResponse.redirect(new URL('/login', request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirectToLogin.cookies.set(c))
      return redirectToLogin
    }

    if (user && SIGNED_OUT_ONLY.includes(path)) {
      const redirectToHome = NextResponse.redirect(new URL('/', request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirectToHome.cookies.set(c))
      return redirectToHome
    }

    return supabaseResponse
  } catch {
    const path = request.nextUrl.pathname
    const isPublic = PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))
    if (!isPublic) {
      if (path.startsWith('/api')) {
        const unauthResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        supabaseResponse.cookies.getAll().forEach(c => unauthResponse.cookies.set(c))
        return unauthResponse
      }
      const redirectToLogin = NextResponse.redirect(new URL('/login', request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirectToLogin.cookies.set(c))
      return redirectToLogin
    }
    return supabaseResponse
  }
}

export const config = {
  // ponytail: no file-extension exclusion — it let /show/[id].png bypass the gate.
  // Only Next internals + favicon are skipped; the few unused /public svgs would just 307.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
