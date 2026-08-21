'use client'
import { useId, type ReactNode } from 'react'

// The login page's card and inputs, lifted so signup, forgot-password and
// reset-password are the same surface rather than three near-copies.
//
// These used to hardcode a cold near-black canvas, violet and orange orbs, a
// solid white submit button and pill radii — the pre-"Autumn Pine" palette —
// justified by a comment claiming the CSS variables were not in play here.
// They are: globals.css is imported by the root layout and applies to every
// route, /login included. Everything below reads the tokens.

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
    // Not min-h-screen: the root layout's <main> already wraps this in 3.5rem
    // of vertical padding (4rem from md up), so a full viewport height here
    // guaranteed a scrollbar on every auth screen.
    <div
      className="flex items-center justify-center min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)]"
      style={{ background: 'var(--surface-page)' }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: 'var(--orb-violet)' }} />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[130px]"
          style={{ background: 'var(--orb-rose)' }} />
      </div>

      <Panel
        onSubmit={onSubmit}
        className="relative w-full max-w-sm p-8 space-y-5"
        style={{
          background: 'var(--surface-modal)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div className="space-y-3">
          <span className="font-extrabold text-xl tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Dorf<span style={{ color: 'var(--brand-mark)' }}>Movies</span>
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          </div>
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
      <input
        id={inputId}
        {...props}
        className="w-full px-4 py-2.5 text-sm placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
        style={{
          background: 'var(--surface-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--border-strong)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border-default)')}
      />
    </div>
  )
}

export function AuthSubmit({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled}
      className="w-full py-2.5 font-semibold text-sm transition-colors disabled:opacity-60"
      style={{
        background: 'var(--btn-primary-bg)',
        color: 'var(--btn-primary-fg)',
        borderRadius: 'var(--radius-sm)',
      }}
      onMouseEnter={e => { if (!disabled) (e.target as HTMLElement).style.background = 'var(--btn-primary-bg-hover)' }}
      onMouseLeave={e => ((e.target as HTMLElement).style.background = 'var(--btn-primary-bg)')}>
      {children}
    </button>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm px-3 py-2"
      style={{
        color: 'var(--live)',
        background: 'var(--rust-tint-bg)',
        border: '1px solid var(--rust-tint-border)',
        borderRadius: 'var(--radius-sm)',
      }}>
      {children}
    </p>
  )
}

export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm px-3 py-2"
      style={{
        color: 'var(--success)',
        background: 'var(--teal-tint-bg)',
        border: '1px solid var(--teal-tint-border)',
        borderRadius: 'var(--radius-sm)',
      }}>
      {children}
    </p>
  )
}
