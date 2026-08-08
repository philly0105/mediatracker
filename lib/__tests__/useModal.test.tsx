import { useState, useEffect } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useModal } from '../useModal'

function Modal({ onClose, name }: { onClose: () => void; name: string }) {
  const { containerRef } = useModal(onClose)
  return (
    <div ref={containerRef} role="dialog" aria-label={name}>
      <button>{name} first</button>
      <button>{name} middle</button>
      <button>{name} last</button>
    </div>
  )
}

// Toggles a modal on and off so we can exercise focus restoration against a
// background element that stays mounted.
function ToggleModal() {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button onClick={() => setOpen(true)}>launch</button>
      {open && <Modal onClose={() => setOpen(false)} name="toggle" />}
    </div>
  )
}

// MediaInfoModal — the app's main modal — returns null on its first render
// until its own mount flag flips, so its panel does not exist when useModal's
// effect first runs. This mirrors that shape.
function LateMountingModal({ onClose }: { onClose: () => void }) {
  const { containerRef } = useModal(onClose)
  const [mounted, setMounted] = useState(false)
  // The cascading render is the whole point of this fixture — it reproduces the
  // portal-mount gate MediaInfoModal uses, which is what disarmed the trap.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return (
    <div ref={containerRef} role="dialog" aria-label="late">
      <button>late first</button>
      <button>late last</button>
    </div>
  )
}

describe('useModal with a panel that mounts after the first render', () => {
  it('still moves focus into the modal', () => {
    render(<LateMountingModal onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('still traps Tab, rather than letting focus escape the modal', () => {
    render(<LateMountingModal onClose={vi.fn()} />)
    const last = screen.getByText('late last')
    last.focus()

    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByText('late first')).toHaveFocus()
  })
})

describe('useModal', () => {
  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<Modal onClose={onClose} name="dialog" />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes only the topmost modal when several are stacked', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <div>
        <Modal onClose={outer} name="outer" />
        <Modal onClose={inner} name="inner" />
      </div>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('locks body scroll while open and restores it on close', () => {
    const { unmount } = render(<Modal onClose={vi.fn()} name="dialog" />)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps body scroll locked until the last stacked modal closes', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    const { rerender, unmount } = render(
      <div>
        <Modal onClose={outer} name="outer" />
        <Modal onClose={inner} name="inner" />
      </div>
    )
    expect(document.body.style.overflow).toBe('hidden')

    // Close the inner modal only — the outer one is still open.
    rerender(
      <div>
        <Modal onClose={outer} name="outer" />
      </div>
    )
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('restores focus to the previously focused element on close', () => {
    render(<ToggleModal />)
    const launch = screen.getByText('launch')
    launch.focus()
    fireEvent.click(launch)
    // Focus moved into the modal on open.
    expect(document.activeElement).not.toBe(launch)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.activeElement).toBe(launch)
  })

  it('wraps Tab from the last focusable element back to the first', () => {
    render(<Modal onClose={vi.fn()} name="dialog" />)
    const first = screen.getByText('dialog first')
    const last = screen.getByText('dialog last')
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })
})