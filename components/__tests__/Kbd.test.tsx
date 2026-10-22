import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { Kbd } from '@/components/ui/Kbd'

function withUserAgent(ua: string) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
}

describe('Kbd', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the command glyph on a Mac', () => {
    withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    render(<Kbd keys="K" />)
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('renders Ctrl on Windows, which is what the handler actually accepts', () => {
    withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    render(<Kbd keys="K" />)
    // The whole point of the component: every call site used to hardcode ⌘.
    expect(screen.getByText('Ctrl K')).toBeInTheDocument()
    expect(screen.queryByText('⌘K')).not.toBeInTheDocument()
  })

  it('treats iPadOS as a Mac platform', () => {
    withUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')
    render(<Kbd keys="K" />)
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })

  it('omits the modifier when mod is false', () => {
    withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    render(<Kbd keys="Esc" mod={false} />)
    expect(screen.getByText('Esc')).toBeInTheDocument()
  })

  it('renders a kbd element carrying the caller class', () => {
    withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    const { container } = render(<Kbd keys="K" className="text-xs" />)
    const el = container.querySelector('kbd')!
    expect(el).toBeInTheDocument()
    expect(el).toHaveClass('text-xs')
  })

  it('carries the chip recipe itself so call sites only add layout', () => {
    withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    const { container } = render(<Kbd keys="K" />)
    const el = container.querySelector('kbd')!
    expect(el).toHaveClass('inline-flex')
    expect(el).toHaveStyle({ height: '22px', borderRadius: 'var(--radius-xs)', background: 'var(--glass-fill-hover)' })
  })

  it('leaves the display mode to a caller that sets one', () => {
    withUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    // The dashboard search bar hides the chip on phones. Tailwind orders
    // `inline-flex` after `hidden`, so a default display class added alongside
    // the caller's would win and show it.
    const { container } = render(<Kbd keys="K" className="hidden md:inline-flex" />)
    const el = container.querySelector('kbd')!
    expect(el).toHaveClass('hidden', 'md:inline-flex')
    expect(el).not.toHaveClass('inline-flex')
  })
})
