import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ResetPasswordPage from '@/app/(public)/reset-password/page'

const getUser = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser } }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('ResetPasswordPage session check', () => {
  beforeEach(() => {
    getUser.mockReset()
  })

  it('shows the password form once a session is confirmed', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })

    await act(async () => { render(<ResetPasswordPage />) })

    expect(screen.getByLabelText('New password')).toBeInTheDocument()
  })

  it('reports a link as expired only when the check succeeds and finds no session', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    await act(async () => { render(<ResetPasswordPage />) })

    expect(screen.getByText('Link expired')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  // The regression this file exists for: getUser() rejects on a dropped
  // connection rather than resolving with a null user. Reporting that as
  // "expired" tells people their working link is dead, and falling through to
  // the form lets them submit a password nothing is signed in to change.
  it('does not claim the link expired when the check itself fails', async () => {
    getUser.mockRejectedValue(new Error('network down'))

    await act(async () => { render(<ResetPasswordPage />) })

    expect(screen.getByText('Could not verify link')).toBeInTheDocument()
    expect(screen.queryByText('Link expired')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })

  it('holds the form back while the check is still in flight', async () => {
    getUser.mockReturnValue(new Promise(() => {}))

    await act(async () => { render(<ResetPasswordPage />) })

    expect(screen.getByText('Verifying link')).toBeInTheDocument()
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
  })
})
