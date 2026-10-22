'use client'
import { useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  label: string
  type: 'watched' | 'watchlist'
  token: string | null
  shareUrl: string | null
}

// The switch track: 44×26 pill, accent when on, the glass-button fill when
// off. The thumb is ink on the accent (white on aqua is too close to read as
// a thumb) and white on the glass fill. Only transform and background move.
// Both wear transparent borders: invisible here (the background shows
// through), but forced colours repaint every background to Canvas and turn
// borders CanvasText, so the track keeps an edge and the thumb stays a disc.
const TRACK: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  width: 44,
  height: 26,
  flex: 'none',
  border: '1px solid transparent',
  borderRadius: 'var(--radius-pill)',
  transition: 'background var(--dur-fast) var(--ease-standard)',
}

// Offsets are from the track's padding box, inside its 1px border, so 2px
// here is the 3px inset the eye sees.
const THUMB: CSSProperties = {
  position: 'absolute',
  top: 2,
  left: 2,
  width: 20,
  height: 20,
  border: '10px solid transparent',
  borderRadius: '50%',
  transition: 'transform var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard)',
}

export default function ShareToggle({ label, type, token: initialToken, shareUrl: initialUrl }: Props) {
  const [token, setToken] = useState(initialToken)
  const [url, setUrl] = useState(initialUrl)
  const [copied, setCopied] = useState(false)

  async function toggle() {
    const enabled = !token
    const res = await fetch('/api/settings/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, enabled }),
    })
    const data = await res.json()
    setToken(data.token)
    setUrl(data.token ? `${window.location.origin}/share/${type}/${data.token}` : null)
  }

  async function copyUrl() {
    if (!url) return
    await navigator.clipboard.writeText(url)

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const on = Boolean(token)

  return (
    // A row inside the Sharing panel. The row hover is for clickable rows and
    // this one only holds controls, so it is pinned to the resting fill.
    <div className="glass-row hover:bg-[var(--glass-card)] flex flex-col gap-3" style={{ padding: '12px 16px' }}>
      <div className="flex items-center justify-between gap-4">
        <span
          style={{
            fontSize: 'var(--text-base)',
            lineHeight: '20px',
            fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-text)',
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </span>
        {/* The state word and the track share one 44px switch, so the word is
            part of the target and reads the state without the colour. Focus
            is the global outline. */}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`Toggle public sharing for ${label}`}
          onClick={toggle}
          className="inline-flex items-center gap-3 min-h-11 px-2 -mr-2 rounded-full cursor-pointer transition-colors hover:bg-[var(--glass-fill-hover)]"
        >
          <span
            style={{
              fontSize: 'var(--text-sm)',
              lineHeight: '18px',
              fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'],
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {on ? 'Enabled' : 'Disabled'}
          </span>
          <span
            aria-hidden="true"
            style={{
              ...TRACK,
              background: on ? 'var(--accent)' : 'var(--btn-ghost-bg)',
              boxShadow: on ? undefined : 'var(--glass-btn-edge)',
            }}
          >
            <span
              style={{
                ...THUMB,
                background: on ? 'var(--ink)' : 'var(--text-primary)',
                transform: on ? 'translateX(18px)' : 'none',
              }}
            />
          </span>
        </button>
      </div>
      {url && (
        <div className="flex gap-2">
          <Input
            readOnly
            value={url}
            aria-label={`${label} public share URL`}
            style={{ fontSize: 'var(--text-sm)' }}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={copyUrl}
            aria-label={`Copy ${label} public share URL`}
            className="shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
      )}
    </div>
  )
}
