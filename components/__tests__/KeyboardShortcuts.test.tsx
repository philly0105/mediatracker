import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import KeyboardShortcuts from '../KeyboardShortcuts'
import { useModal } from '@/lib/useModal'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

function TestModal({ onClose }: { onClose: () => void }) {
  const { containerRef } = useModal(onClose)
  return (
    <div ref={containerRef} role="dialog">
      <button>modal button</button>
    </div>
  )
}

describe('KeyboardShortcuts', () => {
  beforeEach(() => {
    push.mockClear()
  })

  it('navigates to /search on /', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: '/' })
    expect(push).toHaveBeenCalledWith('/search')
  })

  it('does not navigate on / while typing in an input', () => {
    render(
      <>
        <KeyboardShortcuts />
        <input data-testid="box" />
      </>
    )
    const box = screen.getByTestId('box')
    box.focus()
    fireEvent.keyDown(box, { key: '/' })
    expect(push).not.toHaveBeenCalled()
  })

  it('does not navigate on / while typing in a textarea', () => {
    render(
      <>
        <KeyboardShortcuts />
        <textarea data-testid="area" />
      </>
    )
    const area = screen.getByTestId('area')
    area.focus()
    fireEvent.keyDown(area, { key: '/' })
    expect(push).not.toHaveBeenCalled()
  })

  it('navigates to /search on Cmd/Ctrl+K', () => {
    render(<KeyboardShortcuts />)
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(push).toHaveBeenCalledWith('/search')
    push.mockClear()
    fireEvent.keyDown(document, { key: 'k', metaKey: true })
    expect(push).toHaveBeenCalledWith('/search')
  })

  it('does not fire while a modal is open', () => {
    render(
      <>
        <KeyboardShortcuts />
        <TestModal onClose={vi.fn()} />
      </>
    )
    fireEvent.keyDown(document, { key: '/' })
    expect(push).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })
    expect(push).not.toHaveBeenCalled()
  })
})