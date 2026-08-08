import React, { useState } from 'react'
import Link from 'next/link'

interface NavItemProps {
  icon: React.ComponentType<any>
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
}

export function NavItem({ icon: Icon, label, active = false, onClick, href }: NavItemProps) {
  const [hover, setHover] = useState(false)

  const style: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: '11px 16px',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    fontWeight: active ? ('var(--weight-semibold)' as any) : ('var(--weight-medium)' as any),
    color: active ? 'var(--text-primary)' : hover ? 'var(--zinc-300)' : 'var(--text-secondary)',
    background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
    border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'color var(--dur-base) var(--ease-standard), background var(--dur-base) var(--ease-standard)',
    width: '100%',
    textAlign: 'left' as const,
  }

  const content = (
    <>
      <Icon
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          color: active ? 'var(--accent)' : hover ? 'var(--zinc-300)' : 'var(--text-muted)',
          transform: hover ? 'scale(1.1)' : 'none',
          transition: 'transform var(--dur-base) var(--ease-out-expo)',
        }}
      />
      <span>{label}</span>
    </>
  )

  const shared = {
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style,
  }

  // A nav entry that goes somewhere is a link; one that only does something
  // is a button. Both are focusable, unlike the old bare <a>.
  return href
    ? <Link href={href} {...shared}>{content}</Link>
    : <button type="button" {...shared}>{content}</button>
}
