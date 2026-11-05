import { render, screen, fireEvent, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import LoginForm from '../LoginForm'
import ForgotPasswordPage from '@/app/(public)/forgot-password/page'

const push = vi.fn()
const refresh = vi.fn()
const signIn = vi.fn()
const resetPassword = vi.fn()
const createClient = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => createClient() }))

beforeEach(() => {
  vi.resetAllMocks()
  createClient.mockReturnValue({ auth: { signInWithPassword: signIn, resetPasswordForEmail: resetPassword } })
  signIn.mockResolvedValue({ error: null })
  resetPassword.mockResolvedValue({ error: null })
})

const flows = [
  { name: 'sign-in', render: () => <LoginForm signupEnabled={false} />, submit: 'Sign in', request: signIn },
  { name: 'password recovery', render: () => <ForgotPasswordPage />, submit: 'Send reset link', request: resetPassword },
]

describe.each(flows)('$name failure recovery', flow => {
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'audit@example.invalid' } })
    if (flow.name === 'sign-in') {
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'longenough' } })
    }
    return act(async () => { fireEvent.submit(screen.getByRole('button', { name: flow.submit }).closest('form')!) })
  }

  it('shows a safe error after a rejected request and allows retry without retyping', async () => {
    flow.request.mockRejectedValueOnce(new Error('internal connection details'))
    render(flow.render())
    await fillAndSubmit()

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server. Try again.')
    expect(screen.getByRole('button', { name: flow.submit })).toBeEnabled()
    expect(screen.getByLabelText('Email')).toHaveValue('audit@example.invalid')
    expect(push).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()

    await act(async () => { fireEvent.submit(screen.getByRole('button', { name: flow.submit }).closest('form')!) })
    expect(flow.request).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    if (flow.name === 'sign-in') {
      expect(push).toHaveBeenCalledWith('/')
      expect(refresh).toHaveBeenCalledOnce()
    } else {
      expect(screen.getByRole('status')).toHaveTextContent('If an account exists for audit@example.invalid')
      expect(resetPassword).toHaveBeenLastCalledWith('audit@example.invalid', {
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      })
    }
  })

  it('also recovers when client initialization throws', async () => {
    createClient.mockImplementationOnce(() => { throw new Error('configuration details') })
    render(flow.render())
    await fillAndSubmit()

    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server. Try again.')
    expect(screen.getByRole('button', { name: flow.submit })).toBeEnabled()
    expect(flow.request).not.toHaveBeenCalled()
  })

  it('keeps service validation errors visible and the form retryable', async () => {
    flow.request.mockResolvedValueOnce({ error: { message: 'Too many requests. Try again later.' } })
    render(flow.render())
    await fillAndSubmit()

    expect(screen.getByRole('alert')).toHaveTextContent('Too many requests. Try again later.')
    expect(screen.getByRole('button', { name: flow.submit })).toBeEnabled()
    expect(push).not.toHaveBeenCalled()
  })
})
