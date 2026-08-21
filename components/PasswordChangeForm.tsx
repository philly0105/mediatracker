'use client'

import { useId, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function PasswordChangeForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const fieldId = useId()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    // 8 to match /signup and /reset-password; Supabase's own floor is 6.
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      
      setSuccess(true)
      setPassword('')
      setConfirm('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 rounded-sm text-sm font-medium text-rust-400"
          style={{ background: 'var(--rust-tint-bg)', border: '1px solid var(--rust-tint-border)' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="flex items-center gap-2 p-3 rounded-sm text-sm font-medium text-[var(--teal-400)]"
          style={{ background: 'var(--teal-tint-bg)', border: '1px solid var(--teal-tint-border)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Password updated successfully.</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor={`${fieldId}-new`} className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 pl-1">New Password</label>
          <Input
            id={`${fieldId}-new`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-confirm`} className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 pl-1">Confirm Password</label>
          <Input
            id={`${fieldId}-confirm`}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading || !password || !confirm}
        fullWidth
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        <span>Update Password</span>
      </Button>
    </form>
  )
}
