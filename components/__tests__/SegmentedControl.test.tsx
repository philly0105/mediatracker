import { act, render, fireEvent, screen } from '@testing-library/react'
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
    // Without it Chromium paints a Canvas backplate over the label.
    expect(selected.className).toContain('forced-colors:forced-color-adjust-none')
    expect(selected.style.background).toBe('')
    expect(screen.getByRole('radio', { name: 'TV Shows' }).className).not.toContain('forced-colors:')
  })

  it('keeps the selected count readable once the segment opts out of forced colours', () => {
    render(
      <SegmentedControl
        options={[{ id: 'must', label: 'Must Watch', count: 12 }, { id: 'someday', label: 'Someday', count: 3 }]}
        value="must"
        onChange={vi.fn()}
      />
    )

    const tally = (name: string) => screen.getByRole('radio', { name }).querySelector('[aria-hidden="true"]')!
    expect(tally('Must Watch · 12').className).toContain('forced-colors:text-[color:HighlightText]')
    expect(tally('Someday · 3').className).not.toContain('forced-colors:')
  })

  it('keeps each segment on one line so a long control scrolls instead of wrapping', () => {
    render(<SegmentedControl options={options} value="movie" onChange={vi.fn()} />)

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.className).toContain('shrink-0')
      expect(radio.className).toContain('whitespace-nowrap')
    }
  })

  // jsdom has no layout: the scroller is 300 wide with 500 of content, the
  // selected Season 4 sits at 380-460, past its right edge, and Season 1 at
  // -120 to -40, past its left one.
  function renderInScroller() {
    const box = (left: number, right: number) => ({ left, right, top: 0, bottom: 36, x: left, y: 0, width: right - left, height: 36, toJSON: () => ({}) })
    const isScroller = (el: Element) => el instanceof HTMLElement && el.dataset.testid === 'scroller'
    const spots: Record<string, [number, number]> = { 'Season 1': [-120, -40], 'Season 4': [380, 460] }
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) { return isScroller(this) ? 500 : 0 })
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) { return isScroller(this) ? 300 : 0 })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (isScroller(this)) return box(0, 300)
      return box(...(spots[this.textContent ?? ''] ?? [0, 0]))
    })

    render(
      <div data-testid="scroller" style={{ overflowX: 'auto' }}>
        <SegmentedControl
          options={[1, 2, 3, 4].map(n => ({ id: `s${n}`, label: `Season ${n}` }))}
          value="s4"
          onChange={vi.fn()}
        />
      </div>
    )
    return screen.getByTestId('scroller')
  }

  // jsdom's :focus-visible heuristic needs a real Tab keystroke history, so
  // the modality is stubbed: the reveal consults the selector and nothing else.
  function focusedByKeyboard(keyboard: boolean) {
    const matches = Element.prototype.matches
    vi.spyOn(Element.prototype, 'matches').mockImplementation(function (this: Element, selector: string) {
      return selector === ':focus-visible' ? keyboard : matches.call(this, selector)
    })
  }

  it('scrolls the selected segment, then a focused one, into its sideways scroller', () => {
    const scroller = renderInScroller()
    // The 160px it overhangs, plus 8 so the ring and the edge show.
    expect(scroller.scrollLeft).toBe(168)

    focusedByKeyboard(true)
    act(() => screen.getByRole('radio', { name: 'Season 1' }).focus())
    expect(scroller.scrollLeft).toBe(168 - 128)
  })

  it('leaves the scroller alone when a click or tap focuses a segment', () => {
    // Scrolling under the pressed pointer would move the segment away before
    // the click lands, so a pointer focus waits for the selection instead.
    const scroller = renderInScroller()
    expect(scroller.scrollLeft).toBe(168)

    focusedByKeyboard(false)
    act(() => screen.getByRole('radio', { name: 'Season 1' }).focus())
    expect(scroller.scrollLeft).toBe(168)
  })

  it('shows a count as a muted suffix and folds it into the name', () => {
    render(
      <SegmentedControl
        options={[{ id: 'must', label: 'Must Watch', count: 12 }, { id: 'someday', label: 'Someday' }]}
        value="must"
        onChange={vi.fn()}
      />
    )

    const counted = screen.getByRole('radio', { name: 'Must Watch · 12' })
    const tally = counted.querySelector('[aria-hidden="true"]')!
    expect(tally).toHaveTextContent('12')
    expect(tally.className).toContain('tabular')
    // No count, no override: the name is still the label alone.
    expect(screen.getByRole('radio', { name: 'Someday' })).not.toHaveAttribute('aria-label')
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
