import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

/** The only two claims anything in this app reads off the session. */
export type AuthUser = { id: string; email?: string }

/**
 * Verifies the session and returns the caller's identity.
 *
 * getClaims(), not getUser(): getUser() is a network round trip to the Supabase
 * Auth server on every single call, and this runs in the proxy, in the app
 * layout, and again in whichever route handler the page then fetches from —
 * four serial auth hops per navigation. getClaims() verifies the access token's
 * signature locally with WebCrypto against a cached JWKS, so the same four
 * checks cost nothing. It still refreshes an about-to-expire session first, so
 * cookie rotation is unaffected.
 *
 * This is only as fast as the project's signing keys allow: with a symmetric
 * JWT secret getClaims() falls back to asking the Auth server, exactly like
 * getUser() did. Asymmetric signing keys have to be enabled in the Supabase
 * dashboard for the local path to kick in.
 *
 * react.cache() still collapses repeat calls inside one render tree.
 */
export const getAuthenticatedUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) return null
  return { id: data.claims.sub, email: data.claims.email }
})
