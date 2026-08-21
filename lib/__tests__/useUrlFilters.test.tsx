import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useUrlFilters, buildQueryString } from '@/lib/useUrlFilters'

// next/navigation is mocked at module scope, following the same pattern as the
// auth-forms test: the router is a plain mock so the URL writes are assertable.
const replace = vi.fn()
let pathname = '/movies'
let searchParams = new URLSearchParams()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}))

// A tiny harness exposing the hook's values and setValue so the tests can step
// through debounced vs immediate URL writes.
function Harness() {
  const [values, setValue, reset] = useUrlFilters({ q: '', sort: 'recent', rating: 'All' })
  return (
    <div>
      <span data-testid="q">{values.q}</span>
      <span data-testid="sort">{values.sort}</span>
      <span data-testid="rating">{values.rating}</span>
      <button onClick={() => setValue('q', 'heat')}>set q</button>
      <button onClick={() => setValue('sort', 'rating')}>set sort</button>
      <button onClick={() => setValue('rating', '4+')}>set rating</button>
      <button onClick={() => reset()}>reset all</button>
      <button onClick={() => reset(['q', 'rating'])}>reset some</button>
    </div>
  )
}

describe('buildQueryString', () => {
  const defaults = { q: '', sort: 'recent', rating: 'All', genre: 'All', decade: 'All' }

  it('produces an empty query string when everything is at its default', () => {
    expect(buildQueryString({ q: '', sort: 'recent', rating: 'All', genre: 'All', decade: 'All' }, defaults)).toBe('')
  })

  it('serialises only the non-default values, in key order', () => {
    expect(buildQueryString({ q: '', sort: 'rating', rating: '4+', genre: 'Horror', decade: 'All' }, defaults))
      .toBe('sort=rating&rating=4%2B&genre=Horror')
  })

  it('drops untracked keys (invalid values fall back to being omitted)', () => {
    expect(buildQueryString({ q: 'heat', bogus: 'x', sort: 'recent' }, defaults)).toBe('q=heat')
  })
})

describe('useUrlFilters', () => {
  beforeEach(() => {
    replace.mockReset()
    pathname = '/movies'
    searchParams = new URLSearchParams('')
  })

  it('reads initial values from the URL, falling back to defaults', () => {
    searchParams = new URLSearchParams('sort=rating&rating=4%2B')
    render(<Harness />)
    expect(screen.getByTestId('q').textContent).toBe('')
    expect(screen.getByTestId('sort').textContent).toBe('rating')
    expect(screen.getByTestId('rating').textContent).toBe('4+')
  })

  it('writes non-free-text keys to the URL immediately', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('set sort'))
    expect(screen.getByTestId('sort').textContent).toBe('rating')
    expect(replace).toHaveBeenCalledWith('/movies?sort=rating', { scroll: false })
  })

  it('debounces URL writes for free-text keys but keeps state immediate', () => {
    vi.useFakeTimers()
    render(<Harness />)
    fireEvent.click(screen.getByText('set q'))

    // State updated at once…
    expect(screen.getByTestId('q').textContent).toBe('heat')
    // …but the URL write is held until the debounce elapses.
    expect(replace).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(350) })
    expect(replace).toHaveBeenCalledWith('/movies?q=heat', { scroll: false })
    vi.useRealTimers()
  })
})

describe('useUrlFilters reset', () => {
  beforeEach(() => {
    replace.mockReset()
    pathname = '/movies'
    searchParams = new URLSearchParams('')
  })

  it('clears every tracked key in a single URL write', () => {
    searchParams = new URLSearchParams('sort=rating&rating=4%2B')
    render(<Harness />)
    replace.mockReset()

    act(() => {
      fireEvent.click(screen.getByText('reset all'))
    })

    expect(screen.getByTestId('sort').textContent).toBe('recent')
    expect(screen.getByTestId('rating').textContent).toBe('All')
    // Looping setValue would have produced one replace per key, each landing
    // in history as its own intermediate URL.
    expect(replace).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith('/movies', { scroll: false })
  })

  it('leaves untargeted keys alone when given a key list', () => {
    searchParams = new URLSearchParams('sort=rating&rating=4%2B')
    render(<Harness />)
    replace.mockReset()

    act(() => {
      fireEvent.click(screen.getByText('reset some'))
    })

    expect(screen.getByTestId('rating').textContent).toBe('All')
    expect(screen.getByTestId('sort').textContent).toBe('rating')
    expect(replace).toHaveBeenCalledWith('/movies?sort=rating', { scroll: false })
  })

  it('cancels a pending free-text debounce instead of letting it restore the query', () => {
    vi.useFakeTimers()
    try {
      render(<Harness />)
      act(() => {
        fireEvent.click(screen.getByText('set q'))
      })
      // The q write is still in flight at this point.
      replace.mockReset()

      act(() => {
        fireEvent.click(screen.getByText('reset all'))
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.getByTestId('q').textContent).toBe('')
      // Exactly one write, from the reset. A surviving debounce would fire a
      // second one and put ?q=heat straight back into the URL.
      expect(replace).toHaveBeenCalledTimes(1)
      expect(replace).toHaveBeenCalledWith('/movies', { scroll: false })
    } finally {
      vi.useRealTimers()
    }
  })
})
