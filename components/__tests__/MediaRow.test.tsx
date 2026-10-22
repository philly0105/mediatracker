import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MediaRow } from '@/components/ui/MediaRow'

describe('MediaRow', () => {
  it('takes the interactive hover class only when it is clickable', () => {
    const { rerender } = render(<MediaRow title="Severance" type="show" />)
    const root = () => screen.getByText('Severance').closest('.glass-row')!
    expect(root().className).not.toContain('media-row-interactive')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    rerender(<MediaRow title="Severance" type="show" onClick={vi.fn()} />)
    expect(root().className).toContain('media-row-interactive')
    expect(root().className).toContain('has-[.media-row-open:focus-visible]:bg-[var(--glass-card-hover)]')
  })

  it('opens from a real button named by the title, not a button role on the root', () => {
    const onClick = vi.fn()
    render(
      <MediaRow title="Severance" type="show" onClick={onClick} rating={4} onRate={vi.fn()}
        actions={<button type="button">Check</button>} />
    )
    // The root carries no role, tabindex or aria-label: nesting the stars and
    // the actions inside a button role is what axe flagged.
    const root = screen.getByText('Severance').closest('.glass-row')!
    expect(root).not.toHaveAttribute('role')
    expect(root).not.toHaveAttribute('tabindex')
    expect(root).not.toHaveAttribute('aria-label')

    const opener = screen.getByRole('button', { name: 'Severance' })
    expect(opener.tagName).toBe('BUTTON')
    expect(opener).toHaveAttribute('type', 'button')
    expect(opener.className).toContain('media-row-open')
    expect(opener.className).toContain('absolute inset-0')
    // Siblings of the opener, so a click on them never reaches it.
    expect(opener).not.toContainElement(screen.getByRole('button', { name: 'Check' }))
    expect(opener).not.toContainElement(screen.getByRole('slider', { name: 'Rating' }))

    // Only the opener opens: once per click, and nothing on the root.
    fireEvent.click(opener)
    expect(onClick).toHaveBeenCalledTimes(1)
    fireEvent.click(root)
    fireEvent.click(screen.getByRole('button', { name: 'Check' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('keeps the actions and stars above the stretched opener', () => {
    render(<MediaRow title="Severance" type="show" onClick={vi.fn()} rating={3} actions={<span>act</span>} />)
    expect(screen.getByText('act').parentElement!.className).toBe('relative z-[1]')
    // The stars shrink to their content so the space beside them still opens the row.
    expect(screen.getByRole('img', { name: 'Rated 3 out of 5' }).parentElement!.className).toBe('relative z-[1] self-start')
  })

  it('pins both sides of the poster thumb', () => {
    render(<MediaRow title="Past Lives" posterUrl="https://image.tmdb.org/t/p/w185/a.jpg" />)
    const img = screen.getByRole('img', { name: 'Past Lives' })
    expect(img.style.width).toBe('60px')
    expect(img.style.height).toBe('90px')
  })

  it('shapes the placeholder from thumbShape, falling back to whether a still was given', () => {
    const { container, rerender } = render(<MediaRow title="Episode 3" type="show" />)
    const placeholder = () => container.querySelector('.glass-row')!.firstElementChild as HTMLElement
    // No art and no shape: today's 60x90 poster placeholder.
    expect(placeholder().style.width).toBe('60px')
    expect(placeholder().className).toBe('')

    // An episode list asks for the still's 16:9 shape even with no still.
    rerender(<MediaRow title="Episode 3" type="show" thumbShape="still" />)
    expect(placeholder().style.width).toBe('')
    expect(placeholder().className).toContain('md:w-40')

    rerender(<MediaRow title="Episode 3" type="show" thumbShape="poster" />)
    expect(placeholder().style.width).toBe('60px')
  })

  it('keeps the 104x58 phone still unless the row asks for the small one', () => {
    const still = 'https://image.tmdb.org/t/p/w300/s.jpg'
    const { container, rerender } = render(<MediaRow title="The Bear" type="show" stillUrl={still} />)
    const img = () => container.querySelector('.glass-row img')!
    // Up next keeps the larger still; only an episode list, whose rows also
    // carry a synopsis and a wide toggle, trades it for text width.
    expect(img().className).toBe('w-[104px] h-[58px] md:w-40 md:h-[90px]')
    rerender(<MediaRow title="The Bear" type="show" stillUrl={still} stillSize="sm" />)
    expect(img().className).toBe('w-[72px] h-10 md:w-40 md:h-[90px]')
  })
})
