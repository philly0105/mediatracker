import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/share']

export async function proxy(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.next()
    }

    let supabaseResponse = NextResponse.next({ request })

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

    if (!user && !isPublic) {
      const redirectToLogin = NextResponse.redirect(new URL('/login', request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirectToLogin.cookies.set(c))
      return redirectToLogin
    }

    if (user && path === '/login') {
      const redirectToHome = NextResponse.redirect(new URL('/', request.url))
      supabaseResponse.cookies.getAll().forEach(c => redirectToHome.cookies.set(c))
      return redirectToHome
    }

    return supabaseResponse
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  // ponytail: no file-extension exclusion — it let /show/[id].png bypass the gate.
  // Only Next internals + favicon are skipped; the few unused /public svgs would just 307.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
