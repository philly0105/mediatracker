import Image from 'next/image'
import React from 'react'
import { ExternalLink, Tv } from 'lucide-react'

export interface StreamingProvider {
  name: string
  /** TMDB provider logo (already a full URL). */
  logoUrl?: string | null
}

export interface StreamingRowProps {
  /** The first flatrate provider. Nothing renders without one. */
  provider?: StreamingProvider | null
  /** TMDB's watch page for the title (the JustWatch attribution link). */
  link?: string | null
}

/**
 * "Streaming on X": one `.glass-row` with the provider's logo, the line and,
 * when TMDB gave one, the attribution link the details modal already shows.
 */
export function StreamingRow({ provider, link }: StreamingRowProps) {
  if (!provider) return null

  return (
    <div
      className="glass-row glass-rim"
      // Wraps so the attribution link drops under the name on phones instead
      // of squeezing it to an ellipsis.
      style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-3) var(--space-4)', padding: '10px 12px 10px 10px' }}
    >
      <div
        style={{
          flex: 'none',
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-thumb)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
          background: 'var(--glass-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}
      >
        {provider.logoUrl ? (
          // Provider logos are 100px squares; the optimizer has nothing to do.
          <Image src={provider.logoUrl} alt="" aria-hidden="true" width={44} height={44} unoptimized style={{ width: 44, height: 44, objectFit: 'cover' }} />
        ) : (
          <Tv className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
        )}
      </div>
      {/* Basis auto, not 0, so the line overflows and wraps the link instead
          of shrinking the name to nothing. */}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)' }}>Streaming on</p>
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-md)',
            lineHeight: '22px',
            fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-text)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {provider.name}
        </p>
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-fill-hover)] hover:text-[var(--white)]"
          style={{ flex: 'none', marginLeft: 'auto', fontSize: 'var(--text-sm)', lineHeight: '18px', fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'] }}
        >
          Provided by JustWatch
          <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
