import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NavItem } from '../ui/NavItem'
import { Home } from 'lucide-react'

describe('NavItem', () => {
  it('renders label and icon correctly', () => {
    const { getByText } = render(
      <NavItem icon={Home} label="Dashboard" />
    )
    expect(getByText('Dashboard')).toBeInTheDocument()
  })

  it('marks the active entry for CSS and for assistive tech', () => {
    const { getByText } = render(
      <NavItem icon={Home} label="Dashboard" active href="/dashboard" />
    )
    // The active treatment is `.nav-item[aria-current='page']` in globals.css,
    // so the attribute is the contract — this used to assert the inline style
    // that a `useState(hover)` implementation produced.
    const linkElement = getByText('Dashboard').closest('a')
    expect(linkElement).toHaveAttribute('aria-current', 'page')
    expect(linkElement).toHaveClass('nav-item')
  })

  it('keeps the nav-item contract when stacked for the compact rail', () => {
    const { getByRole } = render(
      <NavItem icon={Home} label="Recommendations" active href="/recommendations" stacked />
    )
    const link = getByRole('link')
    // The rail only changes the layout; the active and hover treatments still
    // come from `.nav-item` and `aria-current`. The full name also travels on
    // the title, as the rail's tooltip.
    expect(link).toHaveClass('nav-item')
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link).toHaveAttribute('title', 'Recommendations')
    expect(link).toHaveStyle({ flexDirection: 'column' })
  })

  it('shows the rail label when stacked but keeps the plain label as the name', () => {
    const { getByRole, getByText } = render(
      <NavItem icon={Home} label="Recommendations" railLabel={'Recom\u00admendations'} href="/recommendations" stacked />
    )
    const link = getByRole('link', { name: 'Recommendations' })
    // The name comes from a visually hidden copy rather than an aria-label,
    // which axe flagged for not matching the visible "Recom-mendations".
    expect(link).not.toHaveAttribute('aria-label')
    expect(getByText('Recom\u00admendations')).toHaveAttribute('aria-hidden', 'true')
    expect(getByText('Recommendations')).toHaveClass('sr-only')
  })

  it('ignores the rail label in the row layout', () => {
    const { getByRole } = render(
      <NavItem icon={Home} label="Recommendations" railLabel={'Recom\u00admendations'} href="/recommendations" />
    )
    const link = getByRole('link')
    expect(link.textContent).toBe('Recommendations')
    expect(link).not.toHaveAttribute('aria-label')
  })

  it('leaves aria-current off an inactive entry', () => {
    const { getByRole } = render(<NavItem icon={Home} label="Dashboard" href="/dashboard" />)
    expect(getByRole('link')).not.toHaveAttribute('aria-current')
  })

  it('triggers onClick when clicked', () => {
    const handleClick = vi.fn()
    const { getByText } = render(
      <NavItem icon={Home} label="Dashboard" onClick={handleClick} />
    )
    fireEvent.click(getByText('Dashboard'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('renders a link when an href is provided', () => {
    const { getByRole } = render(
      <NavItem icon={Home} label="Stats" href="/stats" />
    )
    const link = getByRole('link')
    expect(link).toHaveAttribute('href', '/stats')
  })

  it('renders a button when no href is provided', () => {
    const { getByRole } = render(
      <NavItem icon={Home} label="Search" />
    )
    expect(getByRole('button')).toBeInTheDocument()
  })
})
