import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DateStack } from '@/components/ui/DateStack'

function stack(container: HTMLElement) {
  const time = container.querySelector('time')!
  const [month, day] = Array.from(time.children).map((c) => c.textContent)
  return { time, month, day }
}

describe('DateStack', () => {
  it('renders the month over the day inside a datetime-bearing <time>', () => {
    const { container } = render(<DateStack date="2026-10-30" />)
    const { time, month, day } = stack(container)
    expect(time).toHaveAttribute('datetime', '2026-10-30')
    expect(month).toBe('Oct')
    expect(day).toBe('30')
  })

  it('does not shift a bare date across the UTC boundary', () => {
    // `new Date('2026-01-01')` is midnight UTC, which is still December 31
    // anywhere west of Greenwich.
    const { container } = render(<DateStack date="2026-01-01" />)
    const { month, day } = stack(container)
    expect(month).toBe('Jan')
    expect(day).toBe('1')
  })

  it('uses the date part of an ISO datetime', () => {
    const { container } = render(<DateStack date="2026-11-03T00:00:00Z" />)
    const { time, month, day } = stack(container)
    expect(time).toHaveAttribute('datetime', '2026-11-03')
    expect(month).toBe('Nov')
    expect(day).toBe('3')
  })

  it('renders nothing for an unparseable date', () => {
    const { container } = render(<DateStack date="soon" />)
    expect(container.querySelector('time')).toBeNull()
  })
})
