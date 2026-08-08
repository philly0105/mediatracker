'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthInput, AuthSubmit, AuthError, AuthNotice } from '@/components/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // The link carries a one-time code that only /auth/callback can exchange
      // for a session; landing straight on /reset-password would arrive with no
      // session and nothing to update.
      redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
    })
    setLoading(false)

    // Deliberately not branching on whether the address exists: a "no such
    // account" message here turns this form into an account-enumeration oracle.
    // Supabase only errors on malformed input or rate limits, which are worth
    // showing.
    if (error) { setError(error.message); return }
    setSent(true)
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
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" autoComplete="email" required
          />
          <AuthSubmit disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</AuthSubmit>
        </>
      )}

      <p className="text-xs text-zinc-500 text-center">
        <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">Back to sign in</Link>
      </p>
    </AuthShell>
  )
}
