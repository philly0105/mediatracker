'use client'
import { useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useModal } from '@/lib/useModal'
import { Kbd } from '@/components/ui/Kbd'
import { Button } from '@/components/ui/Button'
import { QUICK_NAV } from '@/lib/quickNav'

interface Props {
  onClose: () => void
  /** Set by <Presence> while the sheet plays its exit animation. */
  exiting?: boolean
}

/** One key cap. `mod` prefixes the platform's ⌘ / Ctrl — see components/ui/Kbd. */
interface Cap {
  keys: string
  mod?: boolean
}

interface Shortcut {
  chord: Cap[]
  label: string
}

const GLOBAL: Shortcut[] = [
  { chord: [{ keys: 'K', mod: true }], label: 'Open search' },
  { chord: [{ keys: '/' }], label: 'Open search' },
  { chord: [{ keys: '?' }], label: 'This help sheet' },
  { chord: [{ keys: 'Esc' }], label: 'Close a dialog, or clear a selection' },
]

const IN_SEARCH: Shortcut[] = [
  { chord: [{ keys: '↑' }, { keys: '↓' }], label: 'Move between results' },
  { chord: [{ keys: '↵' }], label: 'Open the highlighted result' },
  { chord: [{ keys: '↵', mod: true }], label: 'Log the highlighted title as watched' },
  { chord: [{ keys: '⇧' }, { keys: '↵' }], label: 'Add the highlighted title to your watchlist' },
]

const TITLE: CSSProperties = {
  margin: '0 0 20px',
  fontSize: 'var(--text-xl)',
  lineHeight: '26px',
  fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
  letterSpacing: 'var(--tracking-snug)',
  color: 'var(--text-primary)',
}

const SECTION_TITLE: CSSProperties = {
  margin: '0 0 4px',
  fontSize: 'var(--text-sm)',
  lineHeight: '18px',
  fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'],
  color: 'var(--text-muted)',
}

// The chip itself is Kbd's own recipe; the row only arranges the caps.
function Row({ chord, label }: Shortcut) {
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <span style={{ fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-secondary)' }}>{label}</span>
      <span className="flex items-center gap-1 shrink-0">
        {chord.map((cap) => (
          <Kbd key={cap.keys} keys={cap.keys} mod={cap.mod ?? false} />
        ))}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={SECTION_TITLE}>{title}</h3>
      <div className="divide-y divide-[var(--border-divider)]">{children}</div>
    </div>
  )
}

export default function KeyboardHelp({ onClose, exiting = false }: Props) {
  // Same portal gate MediaInfoModal uses: read-only, so no state is set during
  // the render pass and nothing is portalled during SSR.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const { containerRef } = useModal(onClose)

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12dvh]" style={{ background: 'var(--scrim)' }}>
      <div className="absolute inset-0" onClick={onClose} />

      {/* The glass panel is a non-scrolling wrapper and the dialog inside it
          scrolls: useModal focuses the dialog, so it has to be the scroller
          for the arrow keys to reach the content (its Tab trap only cycles
          the Close button), while the rim is an absolutely positioned edge
          that would scroll away with the content if it sat on the scroller.
          The scroller clips to the inherited radius. */}
      <div className={`${exiting ? 'dialog-out' : 'dialog-in'} glass-panel glass-rim relative w-full max-w-lg`}>
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="keyboard-help-title"
          className="relative max-h-[76dvh] overflow-y-auto rounded-[inherit] p-6"
        >
          <div className="absolute top-3 right-3 z-[1]">
            <Button variant="icon" aria-label="Close" onClick={onClose}>
              <X className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </div>

          <h2 id="keyboard-help-title" style={TITLE}>
            Keyboard shortcuts
          </h2>

          <div className="space-y-5">
            <Section title="Anywhere">
              {GLOBAL.map((s) => <Row key={s.label + s.chord.map((c) => c.keys).join()} {...s} />)}
            </Section>

            <Section title="Go to">
              {QUICK_NAV.map((item) => (
                <Row key={item.href} chord={[{ keys: 'g' }, { keys: item.key }]} label={item.name} />
              ))}
            </Section>

            <Section title="In search">
              {IN_SEARCH.map((s) => <Row key={s.label + s.chord.map((c) => c.keys).join()} {...s} />)}
            </Section>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
