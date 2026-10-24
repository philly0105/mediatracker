'use server'

import { cookies } from 'next/headers'
import { redirect, RedirectType } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Ends the session.
 *
 * A Server Action rather than a click handler on the browser client: proxy.ts
 * gates every request on the Supabase auth cookies, and only a server write
 * puts the clearing Set-Cookie headers on the response the click produces. A
 * client-side `signOut()` rewrites `document.cookie` after the fact, which
 * leaves the in-flight navigation — and any RSC prefetch already on the wire —
 * still carrying a session the gate honours.
 *
 * `scope: 'local'` is what the row promises ("End your session on this
 * device"): it revokes this refresh token and leaves other devices signed in.
 */
export async function signOut() {
  const supabase = await createClient()
  // @supabase/ssr clears the cookie chunks from its own SIGNED_OUT handler,
  // which it awaits before signOut() resolves, so they are on this response.
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    // Only the upstream revoke can fail here, and it returns before the
    // cookies are touched — which would bounce the user straight back through
    // the gate with nothing on screen to explain it. The cookies are what
    // signs them out, so drop them regardless; `sb-` is the prefix
    // @supabase/ssr names its auth cookies with.
    const cookieStore = await cookies()
    for (const { name } of cookieStore.getAll()) {
      if (name.startsWith('sb-')) cookieStore.delete(name)
    }
  }

  // Outside any try/catch, because redirect() works by throwing. `replace`
  // rather than the push a Server Action defaults to: the signed-out history
  // entry is not somewhere Back should return to, and every entry behind it
  // is gated and would only bounce here again.
  redirect('/login', RedirectType.replace)
}
