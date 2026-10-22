import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatTile } from '@/components/ui/StatTile'

describe('StatTile', () => {
  it('reads label first, then the numeral and its unit', () => {
    const { container } = render(<StatTile label="In progress" value={5} unit="shows" />)
    expect(container.textContent).toBe('In progress5shows')
    // The unit is its own muted word on the numeral's baseline.
    const unit = screen.getByText('shows')
    expect(unit.style.color).toBe('var(--text-muted)')
    expect(unit.parentElement!.style.alignItems).toBe('baseline')
  })

  it('keeps an icon centred on the numeral when there is no unit', () => {
    render(<StatTile label="Average rating" value="3.9" icon={<svg data-testid="star" />} />)
    const numeral = screen.getByTestId('star').parentElement!.parentElement!
    expect(numeral.style.alignItems).toBe('center')
  })
})
