import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

const getClaims = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims } }),
}))

function get(path: string) {
  return proxy(new NextRequest(`http://localhost:3000${path}`))
}

function location(res: Response): string {
  return res.headers.get('location') ?? ''
}

beforeEach(() => {
  // The gate only engages when Supabase is configured; without these the proxy
  // waves everything through and the assertions below would mean nothing.
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
  getClaims.mockReset()
  // Signed out: the state a link-preview crawler is always in.
  getClaims.mockResolvedValue({ data: null })
})

afterEach(() => { vi.unstubAllEnvs() })

describe('proxy public metadata routes', () => {
  it.each([
    '/opengraph-image',
    '/icon',
    '/apple-icon',
    '/manifest.webmanifest',
    '/robots.txt',
    '/sitemap.xml',
  ])('serves %s to a signed-out visitor', async (path) => {
    const res = await get(path)
    expect(res.status).toBe(200)
    expect(location(res)).toBe('')
  })

  it('serves /icon with the cache-busting query Next appends', async () => {
    // The login page links it as /icon?bdf430defe236620, so the match has to
    // be on the pathname rather than the whole URL.
    expect((await get('/icon?bdf430defe236620')).status).toBe(200)
  })

  it('decides without constructing a Supabase client', async () => {
    await get('/opengraph-image')
    expect(getClaims).not.toHaveBeenCalled()
  })
})

describe('proxy gate', () => {
  it('still redirects a signed-out visitor away from an app page', async () => {
    const res = await get('/library')
    expect(res.status).toBe(307)
    expect(location(res)).toBe('http://localhost:3000/login')
  })

  it('does not let a prefix of a public file through', async () => {
    // Exact pathnames, not startsWith: /icons/secret is a page, not an icon.
    for (const path of ['/icons/secret', '/icon/secret', '/iconography', '/manifest.webmanifest/x']) {
      expect(location(await get(path))).toBe('http://localhost:3000/login')
    }
  })

  it('keeps per-title OG images gated', async () => {
    // These render a user's own titles; /share/** is the only public view.
    for (const path of [
      '/show/123/opengraph-image-abc123.png',
      '/person/55/opengraph-image',
      '/collections/9/opengraph-image',
    ]) {
      expect(location(await get(path))).toBe('http://localhost:3000/login')
    }
  })

  it('answers 401 rather than a redirect for the API', async () => {
    const res = await get('/api/watchlist')
    expect(res.status).toBe(401)
  })

  it('leaves the already-public auth pages alone', async () => {
    expect((await get('/login')).status).toBe(200)
    expect((await get('/share/watched/abc')).status).toBe(200)
  })
})
