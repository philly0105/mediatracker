import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('is the white primary pill by default, with the radius left to .btn', () => {
    render(<Button>Mark watched</Button>)
    const button = screen.getByRole('button', { name: 'Mark watched' })
    expect(button).toHaveClass('btn', 'btn-primary')
    // An inline radius used to beat the pill from `.btn`.
    expect(button.style.borderRadius).toBe('')
  })

  it('renders secondary as a glass pill, not the white one', () => {
    render(<Button variant="secondary">Episodes</Button>)
    const button = screen.getByRole('button', { name: 'Episodes' })
    expect(button).toHaveClass('glass-btn')
    expect(button).not.toHaveClass('btn-primary')
  })

  it('renders icon as a square glass circle named by its label', () => {
    render(
      <Button variant="icon" aria-label="Rate Severance">
        <svg />
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Rate Severance' })
    expect(button).toHaveClass('glass-btn')
    expect(button.style.width).toBe(button.style.height)
    expect(button.style.padding).toBe('0px')
  })

  it('gives the glass pills their own text colour and no hover while disabled', () => {
    // `.glass-btn` paints only the fill, so the colour would otherwise be
    // inherited from whatever row the button sits in.
    render(<Button variant="secondary" disabled>Episodes</Button>)
    expect(screen.getByRole('button', { name: 'Episodes' })).toHaveClass(
      'text-[var(--text-primary)]',
      'disabled:hover:bg-[var(--btn-ghost-bg)]'
    )
  })

  it('dims a disabled primary like every other variant', () => {
    // `.btn-primary:disabled` in globals.css swaps the white fill for glass;
    // the 40% here is what says disabled, so a disabled primary never looks
    // brighter than the disabled buttons beside it.
    render(
      <>
        <Button disabled>Update Password</Button>
        <Button variant="secondary" disabled>Episodes</Button>
      </>
    )
    expect(screen.getByRole('button', { name: 'Update Password' }).style.opacity).toBe('0.4')
    expect(screen.getByRole('button', { name: 'Episodes' }).style.opacity).toBe('0.4')
  })

  it('keeps the tone class on top of the variant', () => {
    render(<Button variant="secondary" tone="destructive">Remove</Button>)
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveClass('glass-btn', 'btn-tone-destructive')
  })
})
