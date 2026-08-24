import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from '../ToastProvider'
import type { ToastOptions } from '../ToastProvider'

type ToastFn = (message: string, options?: ToastOptions) => string

function Harness({ onToast }: { onToast: (toast: ToastFn) => void }) {
  const { toast } = useToast()
  onToast(toast)
  return <button onClick={() => toast('Hello there')}>trigger</button>
}

function renderHarness() {
  let toastFn: ToastFn | null = null
  render(
    <ToastProvider>
      <Harness onToast={(t) => { toastFn = t }} />
    </ToastProvider>
  )
  return {
    trigger: () => fireEvent.click(screen.getByText('trigger')),
    toast: (message: string, options?: ToastOptions) => {
      if (toastFn) toastFn(message, options)
    },
  }
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // No manual `document.body.innerHTML = ''` here. Testing Library's automatic
    // cleanup unmounts the tree itself, and wiping the body first detaches the
    // portal container out from under React, which then throws NotFoundError.
  })

  it('does not put Framer Motion in the root provider graph', () => {
    const source = readFileSync(join(__dirname, '..', 'ToastProvider.tsx'), 'utf8')
    expect(source).not.toContain("from 'framer-motion'")
  })

  it('renders a toast message with a polite live region', () => {
    const { trigger } = renderHarness()
    trigger()
    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('auto-dismisses after durationMs', () => {
    const { trigger } = renderHarness()
    trigger()
    expect(screen.getByText('Hello there')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('Hello there')).not.toBeInTheDocument()
  })

  it('removes a toast on manual dismiss', () => {
    const { trigger } = renderHarness()
    trigger()
    expect(screen.getByText('Hello there')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Dismiss notification'))
    expect(screen.queryByText('Hello there')).not.toBeInTheDocument()
  })

  it('fires the action onClick and then dismisses the toast', async () => {
    const onClick = vi.fn()
    const { toast } = renderHarness()

    act(() => {
      toast('Action toast', { action: { label: 'Undo', onClick } })
    })

    expect(screen.getByText('Action toast')).toBeInTheDocument()

    // The handler awaits onClick before dismissing, so the dismiss lands a
    // microtask later — the click has to be awaited inside act to see it.
    await act(async () => {
      fireEvent.click(screen.getByText('Undo'))
    })

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Action toast')).not.toBeInTheDocument()
  })

  it('dismisses an action toast even when its onClick rejects', async () => {
    const onClick = vi.fn().mockRejectedValue(new Error('nope'))
    const { toast } = renderHarness()

    act(() => {
      toast('Action toast', { action: { label: 'Undo', onClick } })
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Undo'))
    })

    expect(screen.queryByText('Action toast')).not.toBeInTheDocument()
  })

  it('uses an assertive alert region for error toasts', () => {
    const { toast } = renderHarness()

    act(() => {
      toast('Something failed', { tone: 'error' })
    })

    expect(screen.getByText('Something failed')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
  })
})