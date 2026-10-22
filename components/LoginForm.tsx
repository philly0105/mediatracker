'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthShell, AuthInput, AuthSubmit, AuthError, AuthLink } from '@/components/AuthShell'

export default function LoginForm({ signupEnabled }: { signupEnabled: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  // /auth/callback sends a rejected or expired link back here with a reason
  // rather than dropping the user on a blank sign-in form.
  const callbackError = useSearchParams().get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account" onSubmit={handleSubmit}>
      {(error || callbackError) && <AuthError>{error || callbackError}</AuthError>}

      <div className="space-y-3">
        <AuthInput
          label="Email"
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" autoComplete="email" required
        />
        <AuthInput
          label="Password"
          type="password" value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" autoComplete="current-password" required
        />
      </div>

      <AuthSubmit disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</AuthSubmit>

      {/* The links are 44px targets, so the row pulls back in to keep the
          text where a 13px line would sit. */}
      <div className="-my-3 flex items-center justify-between">
        <AuthLink href="/forgot-password">Forgot password?</AuthLink>
        {/* Hidden rather than shown-and-rejected when signup is off: the page
            cannot check the invite code, but it can be told whether one exists. */}
        {signupEnabled && <AuthLink href="/signup">Create an account</AuthLink>}
      </div>
    </AuthShell>
  )
}
