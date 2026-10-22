import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

describe('SegmentedControl', () => {
  const options = [
    { id: 'movie', label: 'Movies' },
    { id: 'show', label: 'TV Shows' },
  ]

  it('renders all options with role=radio and radiogroup', () => {
    render(
      <SegmentedControl
        options={options}
        value="movie"
        onChange={vi.fn()}
        label="Select media type"
      />
    )

    const group = screen.getByRole('radiogroup', { name: 'Select media type' })
    expect(group).toBeInTheDocument()

    const movieRadio = screen.getByRole('radio', { name: 'Movies' })
    const showRadio = screen.getByRole('radio', { name: 'TV Shows' })

    expect(movieRadio).toBeInTheDocument()
    expect(showRadio).toBeInTheDocument()
    expect(movieRadio).toHaveAttribute('aria-checked', 'true')
    expect(showRadio).toHaveAttribute('aria-checked', 'false')
  })

  it('marks the selected segment for forced colours, with no inline fill to beat it', () => {
    render(<SegmentedControl options={options} value="movie" onChange={vi.fn()} />)

    const selected = screen.getByRole('radio', { name: 'Movies' })
    expect(selected.className).toContain('forced-colors:bg-[color:Highlight]')
    expect(selected.style.background).toBe('')
    expect(screen.getByRole('radio', { name: 'TV Shows' }).className).not.toContain('forced-colors:')
  })

  it('triggers onChange with the selected option id', () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        options={options}
        value="movie"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('radio', { name: 'TV Shows' }))
    expect(onChange).toHaveBeenCalledWith('show')
  })

  it('updates aria-checked when selection state changes', () => {
    let current = 'movie'
    const { rerender } = render(
      <SegmentedControl
        options={options}
        value={current}
        onChange={(val) => { current = val }}
        label="Select media type"
      />
    )

    const movieRadio = screen.getByRole('radio', { name: 'Movies' })
    const showRadio = screen.getByRole('radio', { name: 'TV Shows' })

    expect(movieRadio).toHaveAttribute('aria-checked', 'true')
    expect(showRadio).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(showRadio)
    expect(current).toBe('show')

    rerender(
      <SegmentedControl
        options={options}
        value="show"
        onChange={(val) => { current = val }}
        label="Select media type"
      />
    )

    expect(movieRadio).toHaveAttribute('aria-checked', 'false')
    expect(showRadio).toHaveAttribute('aria-checked', 'true')
  })
})
