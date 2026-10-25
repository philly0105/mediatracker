import { useState } from 'react'
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

  // The group announces as a radio group, so it owes the keyboard what one
  // does: a single tab stop, and the arrows moving selection and focus
  // together. Before this it was N tab stops and the arrows did nothing, which
  // is exactly the dead end a screen reader's forms mode puts the user in.
  describe('keyboard', () => {
    function Controlled({ initial = 'movie' }: { initial?: string }) {
      const [value, setValue] = useState(initial)
      const seasons = [1, 2, 3].map(n => ({ id: `s${n}`, label: `Season ${n}` }))
      return <SegmentedControl options={initial.startsWith('s') ? seasons : options} value={value} onChange={setValue} label="Type" />
    }

    it('is a single tab stop, on the selected segment', () => {
      render(<Controlled />)
      expect(screen.getByRole('radio', { name: 'Movies' })).toHaveAttribute('tabindex', '0')
      expect(screen.getByRole('radio', { name: 'TV Shows' })).toHaveAttribute('tabindex', '-1')
    })

    it('moves selection and focus together, and wraps at both ends', () => {
      render(<Controlled />)
      const movies = screen.getByRole('radio', { name: 'Movies' })
      act(() => movies.focus())

      fireEvent.keyDown(movies, { key: 'ArrowRight' })
      const shows = screen.getByRole('radio', { name: 'TV Shows' })
      expect(shows).toHaveAttribute('aria-checked', 'true')
      expect(shows).toHaveFocus()

      // Past the end, back to the start.
      fireEvent.keyDown(shows, { key: 'ArrowRight' })
      expect(screen.getByRole('radio', { name: 'Movies' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'Movies' })).toHaveFocus()

      // And backwards off the start, round to the end.
      fireEvent.keyDown(screen.getByRole('radio', { name: 'Movies' }), { key: 'ArrowLeft' })
      expect(screen.getByRole('radio', { name: 'TV Shows' })).toHaveAttribute('aria-checked', 'true')
    })

    it('takes Up and Down as well, since nothing here scrolls vertically', () => {
      render(<Controlled />)
      fireEvent.keyDown(screen.getByRole('radio', { name: 'Movies' }), { key: 'ArrowDown' })
      expect(screen.getByRole('radio', { name: 'TV Shows' })).toHaveAttribute('aria-checked', 'true')

      fireEvent.keyDown(screen.getByRole('radio', { name: 'TV Shows' }), { key: 'ArrowUp' })
      expect(screen.getByRole('radio', { name: 'Movies' })).toHaveAttribute('aria-checked', 'true')
    })

    it('jumps to either end with Home and End', () => {
      render(<Controlled initial="s2" />)
      fireEvent.keyDown(screen.getByRole('radio', { name: 'Season 2' }), { key: 'End' })
      expect(screen.getByRole('radio', { name: 'Season 3' })).toHaveAttribute('aria-checked', 'true')

      fireEvent.keyDown(screen.getByRole('radio', { name: 'Season 3' }), { key: 'Home' })
      expect(screen.getByRole('radio', { name: 'Season 1' })).toHaveAttribute('aria-checked', 'true')
    })

    it('does not report a change when the key lands on the selected segment', () => {
      // Callers read onChange as "the selection changed": the import panel
      // clears its loaded rows on a mode change, so Home on the first segment
      // used to throw a preview away.
      const onChange = vi.fn()
      render(<SegmentedControl options={options} value="movie" onChange={onChange} />)
      const movies = screen.getByRole('radio', { name: 'Movies' })
      act(() => movies.focus())

      fireEvent.keyDown(movies, { key: 'Home' })
      expect(onChange).not.toHaveBeenCalled()
      expect(movies).toHaveFocus()

      fireEvent.keyDown(movies, { key: 'End' })
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith('show')
    })

    it('leaves every other key to the browser', () => {
      const onChange = vi.fn()
      render(<SegmentedControl options={options} value="movie" onChange={onChange} />)
      fireEvent.keyDown(screen.getByRole('radio', { name: 'Movies' }), { key: 'Tab' })
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  it('keeps one type weight across both states, so selecting never re-measures the track', () => {
    render(<SegmentedControl options={options} value="movie" onChange={vi.fn()} />)

    for (const segment of screen.getAllByRole('radio')) {
      expect(segment.className).toContain('font-semibold')
      expect(segment.className).not.toContain('font-medium')
    }
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
