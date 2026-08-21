'use client'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useModal } from '@/lib/useModal'
import { Kbd } from '@/components/ui/Kbd'
import { QUICK_NAV } from '@/lib/quickNav'

interface Props {
  onClose: () => void
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

const CAP_CLASS = 'inline-flex items-center text-[10px] font-semibold text-zinc-400 border border-white/10 rounded px-1.5 py-0.5'

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

function Row({ chord, label }: Shortcut) {
  return (
    <div className="flex items-center justify-between gap-6 py-2">
      <span className="text-sm text-zinc-300">{label}</span>
      <span className="flex items-center gap-1 shrink-0">
        {chord.map((cap) => (
          <Kbd key={cap.keys} keys={cap.keys} mod={cap.mod ?? false} className={CAP_CLASS} />
        ))}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">{title}</h3>
      <div className="divide-y divide-[var(--border-subtle)]">{children}</div>
    </div>
  )
}

export default function KeyboardHelp({ onClose }: Props) {
  // Same portal gate MediaInfoModal uses: read-only, so no state is set during
  // the render pass and nothing is portalled during SSR.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const { containerRef } = useModal(onClose)

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12dvh]" style={{ background: 'var(--scrim)' }}>
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        style={{ background: 'var(--surface-modal)' }}
        className="relative w-full max-w-lg rounded-[var(--radius-2xl)] border border-white/15 p-6 shadow-2xl max-h-[76dvh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-sm text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 id="keyboard-help-title" className="text-lg font-bold tracking-tight text-white mb-5">
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
      </motion.div>
    </div>,
    document.body
  )
}
