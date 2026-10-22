import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Skeleton } from '@/components/ui/Skeleton'

describe('Skeleton', () => {
  it('falls back to the control radius when the caller gives none', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    expect(container.firstChild).toHaveClass('rounded-[var(--radius-sm)]')
  })

  // Tailwind sorts same-property utilities by name, so a default radius in
  // the class list would beat most of the radii callers ask for.
  it.each(['rounded-[var(--radius-xl)]', 'rounded-full'])('leaves %s to the caller', (radius) => {
    const { container } = render(<Skeleton className={`aspect-[2/3] ${radius}`} />)
    expect(container.firstChild).toHaveClass(radius)
    expect(container.firstChild).not.toHaveClass('rounded-[var(--radius-sm)]')
  })
})
