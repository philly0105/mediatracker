import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Wordmark } from '@/components/ui/Wordmark'

// One wordmark for the sidebar, the mobile bar, the auth pages and the share
// footer; the compact rail hides the name through `textClassName`.
describe('Wordmark', () => {
  it('renders the decorative mark beside the name', () => {
    const { container } = render(<Wordmark />)
    expect(screen.getByText('DorfMovies')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('puts textClassName on the name only', () => {
    render(<Wordmark textClassName="hidden lg:inline" />)
    expect(screen.getByText('DorfMovies')).toHaveClass('hidden', 'lg:inline')
  })
})
