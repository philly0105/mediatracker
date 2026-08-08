'use client'
import type { ReactNode } from 'react'

// The login page's card, orbs and pill inputs, lifted so signup, forgot-password
// and reset-password are the same surface rather than three near-copies. Styles
// are inline here for the same reason they were inline there: these screens
// render before the app shell and its CSS variables are in play.

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
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d0f' }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 -left-48 w-[700px] h-[700px] rounded-full blur-[150px]"
          style={{ background: 'rgba(109,40,217,0.18)' }} />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[130px]"
          style={{ background: 'rgba(234,88,12,0.14)' }} />
      </div>

      <Panel onSubmit={onSubmit} className="relative w-full max-w-sm p-8 space-y-5 rounded-3xl backdrop-blur-md"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>
        {children}
      </Panel>
    </div>
  )
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-2.5 rounded-full text-white text-sm placeholder:text-zinc-500 focus:outline-none transition-colors"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
    />
  )
}

export function AuthSubmit({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  return (
    <button type="submit" disabled={disabled}
      className="w-full py-2.5 rounded-full font-medium text-sm transition-colors disabled:opacity-60"
      style={{ background: '#ffffff', color: '#0d0d0f' }}
      onMouseEnter={e => { if (!disabled) (e.target as HTMLElement).style.background = '#e4e4e7' }}
      onMouseLeave={e => ((e.target as HTMLElement).style.background = '#ffffff')}>
      {children}
    </button>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-rose-400 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)' }}>
      {children}
    </p>
  )
}

export function AuthNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm text-emerald-400 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
      {children}
    </p>
  )
}
