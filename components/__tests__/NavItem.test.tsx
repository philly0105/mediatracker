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

  it('applies active styles when active prop is true', () => {
    const { getByText } = render(
      <NavItem icon={Home} label="Dashboard" active />
    )
    const linkElement = getByText('Dashboard').closest('a')
    expect(linkElement).toHaveStyle({
      color: 'var(--text-primary)',
      background: 'rgba(255,255,255,0.05)',
    })
  })

  it('triggers onClick when clicked', () => {
    const handleClick = vi.fn()
    const { getByText } = render(
      <NavItem icon={Home} label="Dashboard" onClick={handleClick} />
    )
    fireEvent.click(getByText('Dashboard'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
