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

// Root metadata routes. The login page's own HTML links every one of these, so
// gating them meant a signed-out visitor — and every link-preview crawler,
// which is always signed out — got a 307 to /login instead: a blank card when
// the site was shared, no favicon on the login page, and a PWA that could not
// install. They are generated from static assets at build time and contain no
// user data, so serving them to anyone is safe. /robots.txt and /sitemap.xml
// are here for the same reason: a crawler cannot authenticate.
//
// The three PNGs are the icons the manifest lists. Opening the manifest alone
// was not enough: it loaded, but every icon it pointed at 307ed to the login
// HTML, so the browser found no usable 192 or 512 icon and still refused to
// install the app.
//
// Exact pathnames, not a prefix or an extension pattern, for the same reason
// the matcher below has none (see the ponytail note): anything looser is a hole.
// `startsWith('/icon')` would admit /icons/secret, and an extension rule would
// admit the per-title OG images at /show/[id]/opengraph-image-*.png — those
// render a user's own titles and must stay behind the gate, with /share/**
// (already in PUBLIC_PATHS) the only public view of a library. A set of whole
// pathnames can only ever admit exactly what is listed.
const PUBLIC_FILES = new Set([
  '/opengraph-image',
  '/icon',
  '/apple-icon',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/robots.txt',
  '/sitemap.xml',
])

export async function proxy(request: NextRequest) {
  // Before the Supabase client, not after: these need no session, and building
  // one to decide they are public would put a JWKS fetch in front of the
  // favicon on a cold start.
  if (PUBLIC_FILES.has(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

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

    // getClaims(), not getUser(): this runs on every request the matcher
    // below lets through — every page navigation, every RSC prefetch and every
    // /api call — and getUser() made each one wait on a round trip to the
    // Supabase Auth server. getClaims() verifies the token signature locally
    // against a cached JWKS, and still refreshes an expiring session first so
    // the cookie rotation below is unaffected. See lib/supabase/server.ts for
    // the signing-key caveat.
    const { data } = await supabase.auth.getClaims()
    const user = data?.claims?.sub ? data.claims : null
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
