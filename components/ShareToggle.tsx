'use client'
import { useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ToastProvider'

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
  const [busy, setBusy] = useState(false)
  // A ref, not the state above, is what actually guards re-entry: two clicks
  // in the same tick would both read a stale `busy`. The state only drives
  // aria-busy. The switch is not `disabled` while in flight — disabling a
  // focused button drops focus to the body, and the window is a few hundred
  // milliseconds.
  const inFlight = useRef(false)

  const { toast } = useToast()

  async function toggle() {
    if (inFlight.current) return
    const enabling = !token

    // MediaCard documents the house preference for an undo over a confirm, and
    // that is right where an undo exists. Here it cannot: the API mints a
    // fresh crypto.randomUUID() on every enable, so turning sharing off and
    // back on hands out a different link and every link already sent is dead.
    // An unrecoverable action gets the dialog.
    if (
      !enabling &&
      !window.confirm(
        `Turn off sharing for ${label}? The link you have already shared will stop working, and turning sharing back on creates a different one.`
      )
    ) {
      return
    }

    inFlight.current = true
    setBusy(true)
    try {
      const res = await fetch('/api/settings/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, enabled: enabling }),
      })
      // The route answers `{ error }` with no token on 401/500, and a platform
      // 502 answers with HTML that res.json() rejects on. Unchecked, both ran
      // `setToken(undefined)` and flipped the switch to "off" while the server
      // went on serving the list at the public URL — the one failure mode the
      // only privacy control in the app must not have.
      if (!res.ok) throw new Error(`Share update failed with ${res.status}`)
      const data = await res.json()
      const newToken: string | null = typeof data?.token === 'string' ? data.token : null
      if (enabling && !newToken) throw new Error('Share update returned no token')

      setToken(newToken)
      setUrl(newToken ? `${window.location.origin}/share/${type}/${newToken}` : null)
      setCopied(false)
      toast(
        newToken
          ? `${label} is shared. Anyone with the link can see it.`
          : 'Sharing is off. The old link no longer works.',
        { tone: 'success' }
      )
    } catch (err) {
      console.error(err)
      // Nothing is set: the switch keeps showing whatever the server last
      // confirmed, which is still the truth.
      toast('Could not update sharing — your link is unchanged.', { tone: 'error' })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
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
          aria-busy={busy}
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
        <>
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
          {/* Both halves of this are things the UI used to leave the reader to
              discover: that the link needs no account, and that the token is
              regenerated on every enable, so a round trip through the switch
              silently invalidates whatever has already been sent out. */}
          <p
            style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              lineHeight: '18px',
              color: 'var(--text-secondary)',
            }}
          >
            Anyone with this link can see this list. Turning sharing off and on again creates a different link.
          </p>
        </>
      )}
    </div>
  )
}
