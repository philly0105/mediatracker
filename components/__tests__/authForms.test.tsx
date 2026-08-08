import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginForm from '../LoginForm'
import SignupForm from '../SignupForm'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(searchParams),
}))

const signInWithPassword = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}))

let searchParams = ''
const mockFetch = vi.fn()

beforeEach(() => {
  searchParams = ''
  push.mockReset()
  refresh.mockReset()
  signInWithPassword.mockReset()
  signInWithPassword.mockResolvedValue({ error: null })
  mockFetch.mockReset()
  global.fetch = mockFetch
})

describe('LoginForm', () => {
  it('offers signup only when the instance has an invite code', () => {
    const { unmount } = render(<LoginForm signupEnabled={false} />)
    expect(screen.queryByText('Create an account')).not.toBeInTheDocument()
    // Recovery is always available — it needs no configuration.
    expect(screen.getByText('Forgot password?')).toBeInTheDocument()
    unmount()

    render(<LoginForm signupEnabled />)
    expect(screen.getByText('Create an account')).toBeInTheDocument()
  })

  it('shows the reason a rejected email link sent the user back here', () => {
    searchParams = 'error=Email+link+is+invalid+or+has+expired'
    render(<LoginForm signupEnabled />)
    expect(screen.getByText('Email link is invalid or has expired')).toBeInTheDocument()
  })

  it('reports a failed sign-in instead of navigating', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    render(<LoginForm signupEnabled />)

    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'hunter2!!' } })
    await act(async () => { fireEvent.submit(screen.getByText('Sign In').closest('form')!) })

    expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})

describe('SignupForm', () => {
  function fill({ password = 'longenough', confirm = 'longenough', code = 'the-code' } = {}) {
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: password } })
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: confirm } })
    fireEvent.change(screen.getByPlaceholderText('Invite code'), { target: { value: code } })
  }

  function submit() {
    return act(async () => {
      fireEvent.submit(screen.getByText('Create account').closest('form')!)
    })
  }

  it('sends the invite code to the server for checking', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ needsConfirmation: true }) })
    render(<SignupForm />)
    fill()
    await submit()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/auth/signup')
    expect(JSON.parse(init.body)).toEqual({
      email: 'a@b.com', password: 'longenough', invite_code: 'the-code',
    })
    expect(screen.getByText('Check your email')).toBeInTheDocument()
  })

  it('goes straight in when the project does not confirm emails', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ needsConfirmation: false }) })
    render(<SignupForm />)
    fill()
    await submit()

    expect(screen.queryByText('Check your email')).not.toBeInTheDocument()
    expect(push).toHaveBeenCalledWith('/')
  })

  it('catches a mismatch before spending a request', async () => {
    render(<SignupForm />)
    fill({ confirm: 'different!' })
    await submit()

    expect(screen.getByText('Those passwords do not match.')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('surfaces a rejected invite code', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'That invite code is not valid.' }) })
    render(<SignupForm />)
    fill({ code: 'guess' })
    await submit()

    expect(screen.getByText('That invite code is not valid.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
