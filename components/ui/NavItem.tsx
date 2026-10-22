import React, { type CSSProperties } from 'react'
import Link from 'next/link'

interface NavItemProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; strokeWidth?: number }>
  label: string
  active?: boolean
  onClick?: () => void
  href?: string
  /** Icon above an 11px label, for the compact rail between md and lg. */
  stacked?: boolean
  /** The stacked label's text when it needs a break point the label lacks,
   *  e.g. a soft hyphen in "Recommendations". The accessible name stays `label`. */
  railLabel?: string
}

// `.nav-item` is unlayered CSS, which no Tailwind utility can override, so the
// rail's column layout is an inline override of the row rule rather than a
// second class. Everything else (fill, hover, active, icon size) is shared.
const STACKED: CSSProperties = {
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 2,
  height: 'auto',
  minHeight: 44,
  padding: '6px 0',
  fontSize: 'var(--text-2xs)',
  lineHeight: '14px',
  letterSpacing: '-0.01em',
  textAlign: 'center',
}

// Presentation lives in globals.css (`.nav-item`), keyed off `aria-current`.
// It was a `useState(hover)` driving an inline style, which re-rendered on every
// pointer move, gave keyboard focus no affordance, and hid the icon's
// `scale(1.1)` from the reduced-motion query.
export function NavItem({ icon: Icon, label, active = false, onClick, href, stacked = false, railLabel }: NavItemProps) {
  const content = (
    <>
      <Icon className="nav-item-icon" strokeWidth={1.8} />
      {/* The rail's labels wrap rather than ellipsise: a one-word label fits
          its 68px, and a longer one breaks where its railLabel allows. */}
      <span style={stacked ? { maxWidth: '100%', whiteSpace: 'normal', overflowWrap: 'anywhere' } : undefined}>
        {stacked && railLabel ? railLabel : label}
      </span>
    </>
  )

  // A nav entry that goes somewhere is a link; one that only does something
  // is a button. Both are focusable, unlike the old bare <a>.
  // The active state is otherwise conveyed only by colour and weight, which a
  // screen reader has no access to.
  const shared = {
    onClick,
    className: 'nav-item',
    'aria-current': active ? ('page' as const) : undefined,
    'aria-label': stacked && railLabel ? label : undefined,
    style: stacked ? STACKED : undefined,
    title: stacked ? label : undefined,
  }

  return href
    ? <Link href={href} {...shared}>{content}</Link>
    : <button type="button" {...shared}>{content}</button>
}
