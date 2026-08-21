import React from 'react'
import Link from 'next/link'

interface NavItemProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
}

// Presentation lives in globals.css (`.nav-item`), keyed off `aria-current`.
// It was a `useState(hover)` driving an inline style, which re-rendered on every
// pointer move, gave keyboard focus no affordance, and hid the icon's
// `scale(1.1)` from the reduced-motion query.
export function NavItem({ icon: Icon, label, active = false, onClick, href }: NavItemProps) {
  const content = (
    <>
      <Icon className="nav-item-icon" />
      <span>{label}</span>
    </>
  )

  // A nav entry that goes somewhere is a link; one that only does something
  // is a button. Both are focusable, unlike the old bare <a>.
  // The active state is otherwise conveyed only by colour and weight, which a
  // screen reader has no access to.
  const shared = { onClick, className: 'nav-item', 'aria-current': active ? ('page' as const) : undefined }

  return href
    ? <Link href={href} {...shared}>{content}</Link>
    : <button type="button" {...shared}>{content}</button>
}
