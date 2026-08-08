import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { GET } from '@/app/auth/callback/route'

const exchangeCodeForSession = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}))

function request(query: string): NextRequest {
  return { url: `http://localhost:3000/auth/callback${query}` } as unknown as NextRequest
}

function location(res: Response): string {
  return res.headers.get('location') ?? ''
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it('exchanges the code and lands on the requested page', async () => {
    const res = await GET(request('?code=abc123&next=%2Freset-password'))
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(location(res)).toBe('http://localhost:3000/reset-password')
  })

  it('defaults to the home page', async () => {
    expect(location(await GET(request('?code=abc123')))).toBe('http://localhost:3000/')
  })

  it('will not redirect off-site', async () => {
    // The link this runs from was emailed, so `next` is attacker-influenced.
    const res = await GET(request('?code=abc123&next=https%3A%2F%2Fevil.example'))
    expect(location(res)).toBe('http://localhost:3000/')

    const protocolRelative = await GET(request('?code=abc123&next=%2F%2Fevil.example'))
    expect(location(protocolRelative)).toBe('http://localhost:3000/')
  })

  it('sends a rejected link back to login with its reason', async () => {
    const res = await GET(request('?error=access_denied&error_description=Email+link+is+invalid'))
    expect(location(res)).toContain('/login?error=')
    expect(decodeURIComponent(location(res))).toContain('Email link is invalid')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('handles a link with no code at all', async () => {
    const res = await GET(request(''))
    expect(location(res)).toContain('/login?error=')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('surfaces an exchange failure rather than dropping the user on a blank form', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'code verifier missing' } })
    const res = await GET(request('?code=abc123'))
    expect(decodeURIComponent(location(res))).toContain('code verifier missing')
  })
})
