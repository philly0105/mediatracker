import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidInviteCode, safeNextPath } from '@/lib/auth'
import { badRequest, readJson } from '@/lib/validation'

// Signup, gated on an invite code.
//
// The check has to happen here rather than in the page: anything the browser
// can see, the browser can skip. SIGNUP_INVITE_CODE is deliberately not
// NEXT_PUBLIC_, so it never reaches the client bundle and the form has no way
// to validate the code before submitting it.
//
// With the code unset, signup is off entirely — a missing secret must fail
// closed, not open.

// Supabase rate-limits the signup call itself, but a wrong code never gets that
// far, so without this the code is brute-forceable at whatever rate the network
// allows. Per-instance and lost on cold start, so it is a speed bump rather than
// a lock: the real defence is a code long enough not to be guessed.
const MAX_ATTEMPTS = 10
const WINDOW_MS = 10 * 60 * 1000
const attempts = new Map<string, { count: number; resetAt: number }>()

export function tooManyAttempts(key: string, now = Date.now()): boolean {
  const current = attempts.get(key)
  if (!current || now > current.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > MAX_ATTEMPTS
}

export function clearAttempts(key: string) {
  attempts.delete(key)
}

export async function POST(request: NextRequest) {
  const inviteCode = process.env.SIGNUP_INVITE_CODE
  if (!inviteCode) {
    return NextResponse.json(
      { error: 'Signup is disabled on this instance.' },
      { status: 503 }
    )
  }

  const bodyRes = await readJson<Record<string, unknown>>(request)
  if (!bodyRes.ok) {
    return badRequest('Invalid request')
  }

  const body = bodyRes.value

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // x-forwarded-for is spoofable; this is a throttle, not an authorization
  // decision, so a shared bucket for everything unattributable is fine.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (tooManyAttempts(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  if (!isValidInviteCode(body.invite_code, inviteCode)) {
    return NextResponse.json({ error: 'That invite code is not valid.' }, { status: 403 })
  }
  clearAttempts(ip)

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const next = safeNextPath(body.next)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // With email confirmation on, signUp returns a user and no session, and the
  // account is inert until the emailed link is followed. With it off, the
  // server client has already written session cookies onto this response and
  // the caller can just navigate. Both are valid configurations, so report
  // which one happened rather than assuming.
  return NextResponse.json({ needsConfirmation: data.session === null }, { status: 201 })
}
