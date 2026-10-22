import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Card } from '@/components/ui/Card'

// The watchlist and person pages render a Card per list item, where blur is
// never allowed, so the default must stay on the unblurred surface recipe and
// only an explicit tier-1 variant may reach for .glass-panel or .glass-slab.
describe('Card', () => {
  it('defaults to the unblurred surface', () => {
    const { container } = render(<Card>body</Card>)
    const card = container.firstElementChild!
    expect(card).toHaveClass('card-surface')
    expect(card).not.toHaveClass('glass-panel')
    expect(card).not.toHaveClass('glass-slab')
  })

  it('renders the tier-1 panel with its rim only when asked', () => {
    const { container } = render(<Card variant="panel">body</Card>)
    expect(container.firstElementChild).toHaveClass('glass-panel', 'glass-rim')
  })

  it('takes a landmark element through `as`', () => {
    render(<Card as="section" aria-label="Up next">body</Card>)
    expect(screen.getByRole('region', { name: 'Up next' }).tagName).toBe('SECTION')
  })

  it('becomes a keyboard-reachable button when clickable', () => {
    const onClick = vi.fn()
    render(<Card onClick={onClick} aria-label="Open">body</Card>)
    const card = screen.getByRole('button', { name: 'Open' })
    expect(card).toHaveClass('card-interactive')
    card.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
