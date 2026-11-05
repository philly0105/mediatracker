'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthInput, AuthSubmit, AuthError, AuthNotice, AuthLink } from '@/components/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // Exchange the one-time code for a session before opening the form.
        redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
      })

      // Keep the confirmation independent of whether the account exists.
      if (error) { setError(error.message); return }
      setSent(true)
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={sent ? 'Check your inbox.' : 'We’ll email you a link.'}
      onSubmit={handleSubmit}
    >
      {error && <AuthError>{error}</AuthError>}

      {sent ? (
        <AuthNotice>
          If an account exists for {email}, a reset link is on its way. The link expires in an hour.
        </AuthNotice>
      ) : (
        <>
          <AuthInput
            label="Email"
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" autoComplete="email" required
          />
          <AuthSubmit disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</AuthSubmit>
        </>
      )}

      <p className="-my-3 text-center">
        <AuthLink href="/login">Back to sign in</AuthLink>
      </p>
    </AuthShell>
  )
}
