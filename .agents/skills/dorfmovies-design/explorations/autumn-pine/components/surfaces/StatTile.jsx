import React from 'react'
import { IconChip } from '../core/IconChip.jsx'

/**
 * DorfMovies StatTile — the bento dashboard stat: an icon chip + small eyebrow
 * label up top, then a giant gradient numeral and a caption. Meant to be
 * dropped inside a SpotlightCard.
 */
const GRADIENTS = {
  orange: 'linear-gradient(135deg, var(--amber-300), var(--amber-500))',
  amber: 'linear-gradient(135deg, var(--amber-300), var(--amber-500))',
  violet: 'linear-gradient(135deg, var(--green-300), var(--green-600))',
  green: 'linear-gradient(135deg, var(--green-300), var(--green-600))',
  gold: 'linear-gradient(135deg, var(--green-300), var(--green-600))',
  rose: 'linear-gradient(135deg, var(--rust-300), var(--rust-500))',
  rust: 'linear-gradient(135deg, var(--rust-300), var(--rust-500))',
  teal: 'linear-gradient(135deg, var(--teal-300), var(--teal-500))',
  white: 'linear-gradient(135deg, var(--zinc-100), var(--zinc-400))',
}

export function StatTile({
  value,
  label,
  icon,
  tone = 'violet',
  tag,
  caption,
  captionIcon,
  hover = false,
  style,
  ...rest
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 'var(--space-8)',
        padding: 'var(--space-6)',
        height: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}>
        <IconChip icon={icon} tone={tone} hover={hover} />
        {tag && (
          <span style={{
            fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase',
            letterSpacing: 'var(--tracking-wide)', color: 'var(--text-muted)',
            background: 'var(--zinc-900)', padding: '4px 7px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', flexShrink: 1, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{tag}</span>
        )}
      </div>
      <div>
        <p style={{
          margin: 0,
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-6xl)',
          fontWeight: 'var(--weight-extrabold)',
          lineHeight: 'var(--leading-none)',
          letterSpacing: 'var(--tracking-tighter)',
          background: GRADIENTS[tone] || GRADIENTS.violet,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}>{value}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
          {captionIcon && <i data-lucide={captionIcon} style={{ width: 14, height: 14, color: `var(--${tone}-500)` }} />}
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)' }}>
            {caption || label}
          </p>
        </div>
      </div>
    </div>
  )
}
