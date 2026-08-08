import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST, tooManyAttempts } from '@/app/api/auth/signup/route'

const signUp = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signUp } }),
}))

// A NextRequest stand-in: the route only ever reads these three things, and
// building a real one under jsdom pulls in more of the runtime than the test
// needs to say anything useful.
function request(body: unknown, ip = '10.0.0.1'): NextRequest {
  return {
    url: 'http://localhost:3000/api/auth/signup',
    headers: new Headers({ 'x-forwarded-for': ip }),
    json: async () => body,
  } as unknown as NextRequest
}

const validBody = { email: 'a@example.com', password: 'longenough', invite_code: 'the-code' }

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    signUp.mockReset()
    signUp.mockResolvedValue({ data: { session: null, user: { id: 'u1' } }, error: null })
    vi.stubEnv('SIGNUP_INVITE_CODE', 'the-code')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://dorf.example')
  })

  afterEach(() => { vi.unstubAllEnvs() })

  it('creates the account when the code matches', async () => {
    const res = await POST(request(validBody, '10.0.0.2'))
    expect(res.status).toBe(201)
    await expect(res.json()).resolves.toEqual({ needsConfirmation: true })
    expect(signUp).toHaveBeenCalledOnce()
  })

  it('sends the confirmation link back through /auth/callback', async () => {
    await POST(request(validBody, '10.0.0.3'))
    expect(signUp.mock.calls[0][0].options.emailRedirectTo)
      .toBe('https://dorf.example/auth/callback?next=%2F')
  })

  it('reports that no confirmation is needed when a session comes back', async () => {
    // Projects with email confirmation switched off get a session straight
    // away; the page navigates instead of showing "check your email".
    signUp.mockResolvedValue({ data: { session: { access_token: 't' }, user: { id: 'u1' } }, error: null })
    const res = await POST(request(validBody, '10.0.0.4'))
    await expect(res.json()).resolves.toEqual({ needsConfirmation: false })
  })

  it('rejects a wrong code without touching Supabase', async () => {
    const res = await POST(request({ ...validBody, invite_code: 'guess' }, '10.0.0.5'))
    expect(res.status).toBe(403)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('is disabled entirely when no code is configured', async () => {
    // Fails closed: an instance that never set the variable must not have an
    // open signup form.
    vi.stubEnv('SIGNUP_INVITE_CODE', '')
    const res = await POST(request(validBody, '10.0.0.6'))
    expect(res.status).toBe(503)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('enforces the password floor server-side', async () => {
    const res = await POST(request({ ...validBody, password: 'short' }, '10.0.0.7'))
    expect(res.status).toBe(400)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('requires an email and a password', async () => {
    const res = await POST(request({ invite_code: 'the-code' }, '10.0.0.8'))
    expect(res.status).toBe(400)
  })

  it('survives a body that is not JSON', async () => {
    const bad = {
      url: 'http://localhost:3000/api/auth/signup',
      headers: new Headers(),
      json: async () => { throw new SyntaxError('bad json') },
    } as unknown as NextRequest
    expect((await POST(bad)).status).toBe(400)
  })

  it('passes a Supabase failure through', async () => {
    signUp.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'User already registered' } })
    const res = await POST(request(validBody, '10.0.0.9'))
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'User already registered' })
  })
})

describe('tooManyAttempts', () => {
  it('allows ten tries and then stops', () => {
    for (let i = 0; i < 10; i++) expect(tooManyAttempts('brute', 1_000)).toBe(false)
    expect(tooManyAttempts('brute', 1_000)).toBe(true)
  })

  it('opens the window again once it has passed', () => {
    for (let i = 0; i < 11; i++) tooManyAttempts('slow', 1_000)
    expect(tooManyAttempts('slow', 1_000 + 11 * 60 * 1000)).toBe(false)
  })

  it('counts each caller separately', () => {
    for (let i = 0; i < 11; i++) tooManyAttempts('noisy', 1_000)
    expect(tooManyAttempts('quiet', 1_000)).toBe(false)
  })
})
