'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AuthShell, AuthInput, AuthSubmit, AuthError, AuthNotice } from '@/components/AuthShell'
import { Button } from '@/components/ui/Button'

// Reached from the emailed recovery link, by way of /auth/callback — which has
// already exchanged the link's code for a session by the time this renders. So
// this is just "change your password", and updateUser applies it to whoever
// that session belongs to.
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Those passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    const { error } = await createClient().auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
  }

  if (hasSession === false) {
    return (
      <AuthShell title="Link expired" subtitle="That reset link is no longer valid.">
        <AuthError>Reset links are single-use and expire after an hour.</AuthError>
        <p className="text-xs text-zinc-500 text-center">
          <Link href="/forgot-password" className="text-zinc-300 hover:text-white transition-colors">
            Request a new one
          </Link>
        </p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You're signed in.">
        <AuthNotice>Your password has been changed.</AuthNotice>
        <Button
          type="button"
          onClick={() => { router.push('/'); router.refresh() }}
          fullWidth
        >
          Continue
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle="At least 8 characters." onSubmit={handleSubmit}>
      {error && <AuthError>{error}</AuthError>}

      <div className="space-y-3">
        <AuthInput
          label="New password"
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="New password" autoComplete="new-password" required minLength={8}
        />
        <AuthInput
          label="Confirm new password"
          type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm new password" autoComplete="new-password" required
        />
      </div>

      <AuthSubmit disabled={loading || hasSession === null}>
        {loading ? 'Saving…' : 'Update password'}
      </AuthSubmit>
    </AuthShell>
  )
}
