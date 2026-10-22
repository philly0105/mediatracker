import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeader } from '@/components/ui/SectionHeader'

describe('SectionHeader', () => {
  it('renders the title as a level-2 heading with the sub line', () => {
    render(<SectionHeader title="Up next" sub="4 more shows in progress" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Up next' })).toBeInTheDocument()
    expect(screen.getByText('4 more shows in progress')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders the trailing action as a link to its href', () => {
    render(<SectionHeader title="Recently watched" action={{ label: 'Library', href: '/library' }} />)
    const link = screen.getByRole('link', { name: 'Library' })
    expect(link).toHaveAttribute('href', '/library')
    // The chevron is decoration; the link is named by its label alone.
    expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('puts the id on the heading so a section can label itself with it', () => {
    render(
      <section aria-labelledby="soon-title">
        <SectionHeader id="soon-title" title="Coming soon" />
      </section>
    )
    expect(screen.getByRole('region', { name: 'Coming soon' })).toBeInTheDocument()
  })
})
