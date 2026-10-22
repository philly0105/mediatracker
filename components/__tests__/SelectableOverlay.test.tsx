import { render, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiSelectProvider, useMultiSelect } from '../MultiSelectProvider'
import { ToastProvider } from '../ToastProvider'
import SelectableOverlay from '../SelectableOverlay'
import type { TmdbSearchResult } from '@/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: () => {},
  }),
}))

const item1: TmdbSearchResult = {
  tmdb_id: 111,
  type: 'movie',
  title: 'Movie One',
  overview: 'Overview One',
  poster_url: null,
  release_year: 2020,
  genres: [],
  vote_average: 8.0,
}

const item2: TmdbSearchResult = {
  tmdb_id: 222,
  type: 'movie',
  title: 'Movie Two',
  overview: 'Overview Two',
  poster_url: null,
  release_year: 2021,
  genres: [],
  vote_average: 7.5,
}

function TestComponent() {
  const { selectedItems } = useMultiSelect()
  return (
    <div>
      <div data-testid="selected-count">{selectedItems.size}</div>
      <div data-testid="selected-keys">{Array.from(selectedItems.keys()).join(',')}</div>
      
      <div data-testid="card-1">
        <SelectableOverlay item={item1}>
          <button data-testid="body-1">Card 1 Body</button>
        </SelectableOverlay>
      </div>

      <div data-testid="card-2">
        <SelectableOverlay item={item2}>
          <button data-testid="body-2">Card 2 Body</button>
        </SelectableOverlay>
      </div>
    </div>
  )
}

describe('SelectableOverlay multiselect behavior', () => {
  it('selects multiple items in sequence and supports clicking overlay', () => {
    // MultiSelectProvider calls useToast to report batch-action outcomes, so it
    // now requires a ToastProvider above it — the same nesting app/layout.tsx has.
    const { getByTestId } = render(
      <ToastProvider>
        <MultiSelectProvider>
          <TestComponent />
        </MultiSelectProvider>
      </ToastProvider>
    )

    const count = getByTestId('selected-count')
    const keys = getByTestId('selected-keys')

    expect(count.textContent).toBe('0')

    // 1. Click checkbox on Card 1
    const card1Element = getByTestId('card-1')
    const buttons = card1Element.querySelectorAll('button')
    // buttons[0] is the checkbox button, buttons[1] is Card 1 Body
    const checkbox1 = buttons[0]
    
    console.log('--- Clicking Checkbox 1 ---')
    fireEvent.click(checkbox1)
    
    expect(count.textContent).toBe('1')
    expect(keys.textContent).toContain('movie-111')

    // 2. Click the card body (which is intercepted by the overlay since isSelectMode is true) on Card 2
    const card2Element = getByTestId('card-2')
    // The overlay is rendered now because isSelectMode is true. Let's find it.
    // It's a div inside card-2 that is absolute inset-0 z-10.
    const overlay2 = card2Element.querySelector('.absolute.inset-0.z-10')
    expect(overlay2).not.toBeNull()

    console.log('--- Clicking Card 2 Overlay ---')
    fireEvent.click(overlay2!)

    expect(count.textContent).toBe('2')
    expect(keys.textContent).toContain('movie-111')
    expect(keys.textContent).toContain('movie-222')

    // 3. Click the checkbox on Card 1 again to deselect
    console.log('--- Clicking Checkbox 1 to Deselect ---')
    fireEvent.click(checkbox1)

    expect(count.textContent).toBe('1')
    expect(keys.textContent).not.toContain('movie-111')
    expect(keys.textContent).toContain('movie-222')
  })

  // PosterCard keeps its badges clear of the chip through `--poster-badge-top`,
  // which the wrapper sets only while the chip shows: by CSS on hover and chip
  // focus, and as a plain class in select mode. The calendar moves the chip
  // off its date stack through the prop.
  it('lets a caller place the chip and moves badges only while it shows', () => {
    const { container } = render(
      <ToastProvider>
        <MultiSelectProvider>
          <SelectableOverlay item={item1}><div>default</div></SelectableOverlay>
          <SelectableOverlay item={item2} chipClassName="left-[63px] top-1/2 -translate-y-1/2"><div>placed</div></SelectableOverlay>
        </MultiSelectProvider>
      </ToastProvider>
    )

    const [chip1, chip2] = Array.from(container.querySelectorAll('button[aria-label^="Select "]'))
    expect(chip1.className).toContain('top-2 left-2')
    expect(chip2.className).toContain('left-[63px] top-1/2 -translate-y-1/2')
    expect(chip2.className).not.toContain('top-2')

    const SHOWN = '[--poster-badge-top:52px]'
    const wrappers = Array.from(container.querySelectorAll('.group'))
    expect(wrappers).toHaveLength(2)
    for (const w of wrappers) {
      expect(w.classList.contains(`hover:${SHOWN}`)).toBe(true)
      expect(w.classList.contains(`has-[>button:focus-visible]:${SHOWN}`)).toBe(true)
      expect(w.classList.contains(SHOWN)).toBe(false)
    }

    // Selecting one card puts every card in select mode, so every chip shows.
    fireEvent.click(chip1)
    for (const w of wrappers) expect(w.classList.contains(SHOWN)).toBe(true)
  })
})
