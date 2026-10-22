import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PageHeader } from '@/components/ui/PageHeader'

// `mb-0` next to `mb-6` would lose to Tailwind's own utility order, so a
// caller's bottom margin has to replace the default rather than sit beside it.
describe('PageHeader', () => {
  const header = () => screen.getByRole('heading', { level: 1 }).closest('header')!

  it('keeps its 24px bottom margin by default', () => {
    render(<PageHeader title="Library" />)
    expect(header()).toHaveClass('mb-6')
  })

  it('drops the default when the caller sets its own bottom margin', () => {
    render(<PageHeader title="Watched" className="mb-0" />)
    expect(header()).toHaveClass('mb-0')
    expect(header()).not.toHaveClass('mb-6')
  })

  it('keeps the default beside unrelated or breakpoint-prefixed classes', () => {
    render(<PageHeader title="Stats" className="sm:items-start md:mb-10" />)
    expect(header()).toHaveClass('mb-6', 'sm:items-start', 'md:mb-10')
  })
})
