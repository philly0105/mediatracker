'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react'
import { UNDO_TOAST_MS } from '@/lib/useDeferredAction'

export type ToastTone = 'success' | 'error' | 'info'
export type ToastAction = { label: string; onClick: () => void | Promise<void> }
export type ToastOptions = { tone?: ToastTone; action?: ToastAction; durationMs?: number }

interface ToastData {
  id: string
  message: string
  tone: ToastTone
  action?: ToastAction
  durationMs: number
}

interface ToastContextType {
  toast: (message: string, options?: ToastOptions) => string
  dismiss: (id: string) => void
}

const Context = createContext<ToastContextType | null>(null)

// The tone is a leading icon rather than a tinted border and text: the message
// stays in the primary colour on every toast, the icon takes the accent, and
// an error's icon is the one --danger exception.
const TONE_ICON: Record<ToastTone, { icon: typeof Info; color: string }> = {
  success: { icon: CheckCircle2, color: 'var(--accent)' },
  error: { icon: AlertCircle, color: 'var(--danger)' },
  info: { icon: Info, color: 'var(--accent)' },
}

// Anything past this and the stack marches up the screen — a bulk action or a
// jittery click can otherwise queue a dozen.
const MAX_TOASTS = 3

function makeToastId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [mounted, setMounted] = useState(false)
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  // Time left on each toast's clock. Hovering or focusing a toast stops it, so
  // the countdown has to survive being torn down and restarted — WCAG 2.2.1
  // wants a way to extend timed content, and a dismiss button is not one.
  const remaining = useRef<Map<string, { ms: number; startedAt: number }>>(new Map())

  // Portals need a real document.body, which does not exist during the server
  // render. Gating on a mount flag is the same approach MultiSelectProvider
  // uses; the rule fires on the pattern itself, and a cascading render once on
  // mount is the point here rather than an accident.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  // Clear any pending auto-dismiss timers on unmount so we never setState after unmount.
  useEffect(() => {
    const timerMap = timers.current
    const remainingMap = remaining.current
    return () => {
      timerMap.forEach((timer) => clearTimeout(timer))
      timerMap.clear()
      remainingMap.clear()
    }
  }, [])

  const clearTimer = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    clearTimer(id)
    remaining.current.delete(id)
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [clearTimer])

  const startTimer = useCallback((id: string, ms: number) => {
    clearTimer(id)
    remaining.current.set(id, { ms, startedAt: Date.now() })
    timers.current.set(id, setTimeout(() => dismiss(id), ms))
  }, [clearTimer, dismiss])

  const pauseTimer = useCallback((id: string) => {
    const left = remaining.current.get(id)
    if (!left || !timers.current.has(id)) return
    clearTimer(id)
    remaining.current.set(id, {
      ms: Math.max(0, left.ms - (Date.now() - left.startedAt)),
      startedAt: Date.now(),
    })
  }, [clearTimer])

  const resumeTimer = useCallback((id: string) => {
    const left = remaining.current.get(id)
    if (!left || timers.current.has(id)) return
    startTimer(id, left.ms)
  }, [startTimer])

  const toast = useCallback((message: string, options?: ToastOptions): string => {
    const id = makeToastId()
    const tone = options?.tone ?? 'info'
    // Actionable toasts default to the undo window rather than an independent
    // constant — a toast that outlives the deferral shows a dead Undo button.
    const durationMs = options?.durationMs ?? (options?.action ? UNDO_TOAST_MS : 5000)
    setToasts((prev) => {
      const next = [...prev, { id, message, tone, action: options?.action, durationMs }]
      if (next.length <= MAX_TOASTS) return next
      // Deterministic given `prev`, so a StrictMode double-invoke drops the
      // same toasts and the clearTimeout is idempotent.
      next.slice(0, next.length - MAX_TOASTS).forEach((dropped) => {
        clearTimer(dropped.id)
        remaining.current.delete(dropped.id)
      })
      return next.slice(-MAX_TOASTS)
    })

    startTimer(id, durationMs)
    return id
  }, [clearTimer, startTimer])

  async function handleAction(t: ToastData) {
    if (!t.action) return
    try {
      await t.action.onClick()
    } catch (err) {
      // Swallow rather than rethrow: this runs from an onClick handler, so a
      // rejection here would surface as an unhandled promise rejection and
      // nothing would be listening. The toast still dismisses either way.
      console.error(err)
    } finally {
      dismiss(t.id)
    }
  }

  return (
    <Context.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast stack. The live-region semantics sit on each toast rather than on
          this container: politeness is latched when a region is registered, so a
          single container whose aria-live flipped between polite and assertive
          would announce unreliably. Per-toast regions also keep one visual stack
          in insertion order, which two separate containers could not. */}
      {mounted && createPortal(
        <div className="fixed left-4 right-4 md:left-auto md:right-6 bottom-24 md:bottom-20 z-[110] flex flex-col items-center md:items-end gap-2 pointer-events-none">
          {toasts.map((t) => {
            const { icon: Icon, color } = TONE_ICON[t.tone]
            return (
              // The one floating glass element: a blurred panel at the inset
              // radius. Three at most are ever on screen, well inside the
              // tier-1 budget. The 44px action and dismiss targets set the
              // height, so the vertical padding is only 6px.
              <div
                key={t.id}
                role={t.tone === 'error' ? 'alert' : 'status'}
                aria-live={t.tone === 'error' ? 'assertive' : 'polite'}
                aria-atomic="true"
                onMouseEnter={() => pauseTimer(t.id)}
                onMouseLeave={() => resumeTimer(t.id)}
                onFocus={() => pauseTimer(t.id)}
                onBlur={() => resumeTimer(t.id)}
                className="toast-enter glass-panel glass-rim pointer-events-auto flex items-center gap-3 w-full md:w-auto md:max-w-sm rounded-[var(--radius-lg)]"
                style={{ padding: '6px 6px 6px 16px' }}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={1.8} aria-hidden="true" style={{ color }} />

                <p
                  className="flex-1"
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-base)',
                    lineHeight: '20px',
                    fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
                    color: 'var(--text-primary)',
                  }}
                >
                  {t.message}
                </p>

                {t.action && (
                  <button
                    onClick={() => handleAction(t)}
                    className="shrink-0 min-h-11 px-3 rounded-full text-[var(--accent)] hover:text-[var(--accent-hover)] hover:bg-[var(--glass-fill-hover)] transition-colors"
                    style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'] }}
                  >
                    {t.action.label}
                  </button>
                )}

                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)] transition-colors"
                >
                  <X className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </Context.Provider>
  )
}

export function useToast() {
  const ctx = useContext(Context)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}