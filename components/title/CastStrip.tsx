import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import { SectionHeader } from '@/components/ui/SectionHeader'

export interface CastMember {
  name: string
  character?: string | null
  /** TMDB profile image (w500). Without one the tile shows the initials. */
  profileUrl?: string | null
}

export interface CastStripProps {
  cast: CastMember[]
  title?: string
  /** Passed to each person link; the modal uses these to close itself on navigation. */
  onNavigate?: React.ComponentProps<typeof Link>['onNavigate']
  newTabLinks?: boolean
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * A horizontal strip of 14-radius headshot tiles, each a link to the person
 * page. Renders nothing for an empty cast, so callers can pass whatever the
 * details payload had.
 */
export function CastStrip({ cast, title = 'Cast', onNavigate, newTabLinks = false }: CastStripProps) {
  if (cast.length === 0) return null

  return (
    <div>
      <SectionHeader title={title} />
      {/* Bleeds through the panel's --space-5 padding like the poster rail,
          so a cut-off tile sits at the rim and reads as scrollable. */}
      <ul
        className="scrollbar-none"
        style={{
          listStyle: 'none',
          margin: '0 calc(var(--space-5) * -1)',
          padding: '0 var(--space-5) 4px',
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 112,
          gap: 12,
          overflowX: 'auto',
        }}
      >
        {cast.map((member) => (
          <li key={member.name} style={{ minWidth: 0 }}>
            <Link
              href={`/person/${encodeURIComponent(member.name)}`}
              onNavigate={onNavigate}
              {...(newTabLinks && { target: '_blank', rel: 'noopener noreferrer' })}
              className="poster-card"
              style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
            >
              <div
                className="poster-card-frame"
                style={{
                  position: 'relative',
                  width: 112,
                  height: 140,
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(150deg, var(--zinc-800), var(--bg-void))',
                }}
              >
                {member.profileUrl ? (
                  <Image
                    src={member.profileUrl}
                    alt=""
                    aria-hidden="true"
                    fill
                    sizes="112px"
                    className="poster-card-img"
                    style={{ objectFit: 'cover', objectPosition: '50% 20%' }}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--text-2xl)',
                      fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
                      letterSpacing: 'var(--tracking-tight)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {initials(member.name)}
                  </span>
                )}
              </div>
              <p
                className="poster-card-title"
                style={{
                  margin: '8px 0 0',
                  fontSize: 'var(--text-sm)',
                  lineHeight: '18px',
                  fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {member.name}
              </p>
              {member.character && (
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: 'var(--text-xs)',
                    lineHeight: '16px',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {member.character}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
