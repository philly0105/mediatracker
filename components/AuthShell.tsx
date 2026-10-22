'use client'
import { useId, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import AmbientBackdrop from '@/components/AmbientBackdrop'
import { Button } from '@/components/ui/Button'
import { Wordmark } from '@/components/ui/Wordmark'

// The login page's card and inputs, lifted so signup, forgot-password and
// reset-password are the same surface rather than three near-copies: the
// wordmark over a centred 420px glass panel, floating on the ambient layer.
//
// These pages have no session, so nothing can register "the most recent
// watch" as the ambient art the way the signed-in layout does. The spec's
// static default is a popular title's backdrop, registered through the same
// AmbientBackdrop registry every other page uses. The host paints an image
// only once it has loaded, so if this file ever disappears from TMDB the
// pages keep the tint, which is what they show while it is on its way anyway.
export const AUTH_BACKDROP = 'https://image.tmdb.org/t/p/w780/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg'

export function AuthShell({
  title,
  subtitle,
  onSubmit,
  children,
}: {
  title: string
  subtitle: string
  /** Omitted for the states that only display something — a server component
   *  cannot hand a function across the boundary, so this has to be optional
   *  rather than a no-op the caller supplies. */
  onSubmit?: (e: React.FormEvent) => void
  children: ReactNode
}) {
  const Panel = onSubmit ? 'form' : 'div'
  return (
    // Not min-h-screen: the public layout's <main> already wraps this in 3rem
    // of vertical padding, so a full viewport height here guaranteed a
    // scrollbar on every auth screen.
    <div className="flex min-h-[calc(100dvh-3rem)] flex-col items-center justify-center gap-6">
      <AmbientBackdrop src={AUTH_BACKDROP} />
      <Wordmark />
      <Panel onSubmit={onSubmit} className="glass-panel glass-rim w-full max-w-[420px] space-y-5 p-6 md:p-7">
        <div className="space-y-1">
          <h1
            className="text-[length:var(--text-2xl)] leading-[30px]"
            style={{
              // Only the top: the panel's space-y supplies the bottom margin,
              // and an inline `margin: 0` would override it.
              marginTop: 0,
              fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
              letterSpacing: 'var(--tracking-tight)',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        </div>
        {children}
      </Panel>
    </div>
  )
}

/**
 * `label` is required. Every field here was labelled by placeholder alone,
 * which is not an accessible name and disappears the moment the user types.
 * The label is visually hidden rather than shown so the card's look is
 * unchanged — swap `sr-only` for a real block if visible labels are wanted.
 */
export function AuthInput({
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      {/* `.input-field` is the inset well (fill, inner shadow, 14px radius,
          44px minimum, placeholder colour); keyboard focus is the global
          outline. No vertical padding: the minimum height centres the text. */}
      <input id={inputId} {...props} className="input-field" style={{ padding: '0 14px' }} />
    </div>
  )
}

export function AuthSubmit({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <Button type="submit" fullWidth disabled={disabled}>
      {children}
    </Button>
  )
}

const noticeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  // Only the top: the panel's space-y supplies the bottom margin, and an
  // inline `margin: 0` would override it.
  marginTop: 0,
  padding: '10px 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-base)',
  lineHeight: '20px',
  fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'],
  textAlign: 'left',
  // The edge is a box-shadow, which forced-colours mode drops. A transparent
  // outline costs nothing normally and is painted in CanvasText there, so the
  // box keeps an outline in High Contrast without changing its size.
  outline: '1px solid transparent',
  outlineOffset: -1,
}

// Red text on the row fill: the one place on these pages that is not white
// or aqua. Rust is retired, so this is --danger, not a tint pair.
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      style={{ ...noticeStyle, color: 'var(--danger)', background: 'var(--glass-card)', boxShadow: 'var(--glass-row-edge)' }}
    >
      <AlertCircle size={18} strokeWidth={1.8} aria-hidden="true" style={{ flex: 'none', marginTop: 1 }} />
      <span>{children}</span>
    </p>
  )
}

// Success is the accent: the aqua tint pair under primary text, with the
// check carrying the colour rather than the sentence.
export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      style={{
        ...noticeStyle,
        color: 'var(--text-primary)',
        background: 'var(--green-tint-bg)',
        boxShadow: 'inset 0 0 0 1px var(--green-tint-border)',
      }}
    >
      <CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" style={{ flex: 'none', marginTop: 1, color: 'var(--accent)' }} />
      <span>{children}</span>
    </p>
  )
}

/**
 * The quiet links under a form ("Forgot password?", "Back to sign in"): meta
 * type, muted until hovered, and tall enough to be a 44px target even though
 * they read as text.
 */
export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'] }}
    >
      {children}
    </Link>
  )
}
