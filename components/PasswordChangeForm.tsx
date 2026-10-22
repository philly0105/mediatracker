'use client'

import { useId, useState, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

// Form labels: 13/18 medium in the secondary colour, plain case.
const LABEL: CSSProperties = {
  display: 'block',
  margin: '0 0 6px 4px',
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'],
  color: 'var(--text-secondary)',
}

// A message box is an inset well (radius 14) whose text and icon carry the
// tone: --danger for an error, the accent for success. The rust and teal
// tints it used to wear both alias to aqua now, which left an error box
// coloured like a success. The well rather than the row fill: the row's +5%
// white put --danger at the edge of 4.5:1 over the warmer backdrops, and the
// well's darkening takes it to about 6:1.
const MESSAGE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-base)',
  lineHeight: '20px',
  fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'],
}

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
          className="glass-inset"
          style={{ ...MESSAGE, color: 'var(--danger)' }}
        >
          <AlertCircle className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          role="status"
          className="glass-inset"
          style={{ ...MESSAGE, color: 'var(--accent)' }}
        >
          <CheckCircle2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
          <span>Password updated successfully.</span>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label htmlFor={`${fieldId}-new`} style={LABEL}>New Password</label>
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
          <label htmlFor={`${fieldId}-confirm`} style={LABEL}>Confirm Password</label>
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
        {loading
          ? <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.8} aria-hidden="true" />
          : <KeyRound className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />}
        <span>Update Password</span>
      </Button>
    </form>
  )
}
