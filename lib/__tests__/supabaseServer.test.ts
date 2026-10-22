import { describe, it, expect, vi } from 'vitest'
import { getAuthenticatedUser } from '@/lib/supabase/server'

const getClaims = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims } }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}))

function withMetadata(user_metadata?: Record<string, unknown>) {
  getClaims.mockResolvedValue({
    data: { claims: { sub: 'user-1', email: 'richard@example.com', user_metadata } },
    error: null,
  })
}

describe('getAuthenticatedUser', () => {
  it('reads the display name off the claims, full_name first', async () => {
    withMetadata({ full_name: 'Richard Dorf', name: 'Rich' })
    await expect(getAuthenticatedUser()).resolves.toEqual({
      id: 'user-1',
      email: 'richard@example.com',
      name: 'Richard Dorf',
    })
  })

  it('falls back to name when full_name is missing, blank or not a string', async () => {
    withMetadata({ name: 'Rich' })
    expect((await getAuthenticatedUser())?.name).toBe('Rich')
    withMetadata({ full_name: '  ', name: 'Rich' })
    expect((await getAuthenticatedUser())?.name).toBe('Rich')
    withMetadata({ full_name: 42, name: 'Rich' })
    expect((await getAuthenticatedUser())?.name).toBe('Rich')
  })

  it('leaves the name out when the metadata has none', async () => {
    withMetadata()
    expect((await getAuthenticatedUser())?.name).toBeUndefined()
    withMetadata({ full_name: '', name: null })
    expect((await getAuthenticatedUser())?.name).toBeUndefined()
  })
})
