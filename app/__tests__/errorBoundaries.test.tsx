import type { ComponentType } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { errorDigest } from '@/lib/errorDigest'

// Every route's error.tsx, called the way Next 16.4 calls it: `{ error, reset,
// retry }`, with `error` typed unknown. The prop has already been renamed once
// (`unstable_retry` in 16.2, `retry` from 16.3), and a boundary still reading
// the old name renders fine and then does nothing when clicked — which is why
// this asserts on the click, not just the render.
type BoundaryProps = { error: unknown; reset: () => void; retry: () => void }
const boundaries = import.meta.glob<{ default: ComponentType<BoundaryProps> }>('../**/error.tsx', { eager: true })

describe('route error boundaries', () => {
  it('finds every boundary', () => {
    // The root one plus one per rendering route under (app).
    expect(Object.keys(boundaries).length).toBeGreaterThanOrEqual(13)
  })

  for (const [path, { default: Boundary }] of Object.entries(boundaries)) {
    it(`${path}: "Try again" retries, not resets`, () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const retry = vi.fn()
      const reset = vi.fn()
      render(<Boundary error={Object.assign(new Error('boom'), { digest: 'abc123' })} reset={reset} retry={retry} />)

      fireEvent.click(screen.getByRole('button', { name: /Try again/ }))
      expect(retry).toHaveBeenCalledTimes(1)
      expect(reset).not.toHaveBeenCalled()
      expect(screen.getByText('Reference: abc123')).toBeInTheDocument()
    })

    it(`${path}: survives a thrown value that is not an Error`, () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      render(<Boundary error="plain string" reset={vi.fn()} retry={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument()
      expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument()
    })
  }
})

describe('errorDigest', () => {
  it('reads the digest Next attaches to a forwarded server error', () => {
    expect(errorDigest(Object.assign(new Error('x'), { digest: 'd1' }))).toBe('d1')
    expect(errorDigest({ digest: 'd2' })).toBe('d2')
  })

  it('returns nothing for anything else that can be thrown', () => {
    for (const thrown of ['text', 42, null, undefined, new Error('x'), { digest: 7 }, { digest: '' }]) {
      expect(errorDigest(thrown)).toBeUndefined()
    }
  })
})
