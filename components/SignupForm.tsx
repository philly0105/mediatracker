'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthShell, AuthInput, AuthSubmit, AuthError, AuthNotice } from '@/components/AuthShell'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Checked here only to save a round trip; the API enforces the same rules,
    // and the invite code is checked nowhere but the server.
    if (password !== confirm) { setError('Those passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, invite_code: inviteCode }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) { setError(body?.error ?? 'Could not create that account.'); return }

      if (body.needsConfirmation) {
        setSent(true)
      } else {
        // Confirmation is off on this project, so the account is already live
        // and the response carried session cookies.
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your email" subtitle={`A confirmation link is on its way to ${email}.`}>
        <AuthNotice>Follow the link to finish setting up your account.</AuthNotice>
        <p className="text-xs text-zinc-500">
          Nothing arrived? Check spam, then{' '}
          <button type="button" onClick={() => setSent(false)} className="text-zinc-300 underline underline-offset-2">
            try again
          </button>
          .
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create an account" subtitle="You'll need an invite code." onSubmit={handleSubmit}>
      {error && <AuthError>{error}</AuthError>}

      <div className="space-y-3">
        <AuthInput
          label="Email"
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" autoComplete="email" required
        />
        <AuthInput
          label="Password"
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" autoComplete="new-password" required minLength={8}
        />
        <AuthInput
          label="Confirm password"
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm password" autoComplete="new-password" required
        />
        <AuthInput
          label="Invite code"
          type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value)}
          placeholder="Invite code" autoComplete="off" required
        />
      </div>

      <AuthSubmit disabled={loading}>{loading ? 'Creating…' : 'Create account'}</AuthSubmit>

      <p className="text-xs text-zinc-500 text-center">
        Already have one?{' '}
        <Link href="/login" className="text-zinc-300 hover:text-white transition-colors">Sign in</Link>
      </p>
    </AuthShell>
  )
}
