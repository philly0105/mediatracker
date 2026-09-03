import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LibraryFilterDrawer from '@/components/LibraryFilterDrawer'

const sortOptions = [
  { id: 'recent' as const, label: 'Recently watched' },
  { id: 'rating' as const, label: 'Rating' },
]
const ratingOptions = [
  { id: 'All', label: 'All' },
  { id: '4+', label: '4+' },
]

function renderDrawer(overrides: Partial<Parameters<typeof LibraryFilterDrawer>[0]> = {}) {
  const props = {
    onClose: vi.fn(),
    sortBy: 'recent' as const,
    ratingFilter: 'All',
    genreFilter: 'All',
    decadeFilter: 'All',
    genres: ['Drama'],
    decades: [1990],
    hasActiveFilters: false,
    setFilter: vi.fn(),
    resetFilters: vi.fn(),
    sortOptions,
    ratingOptions,
    ...overrides,
  }
  render(<LibraryFilterDrawer {...props} />)
  return props
}

describe('LibraryFilterDrawer', () => {
  it('holds every secondary filter the toolbar no longer shows', () => {
    renderDrawer()

    expect(screen.getByRole('combobox', { name: 'Sort by' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Rating' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by genre' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filter by decade' })).toBeInTheDocument()
  })

  it('writes a changed filter straight through rather than holding it', () => {
    const { setFilter } = renderDrawer()

    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
      target: { value: 'rating' },
    })

    expect(setFilter).toHaveBeenCalledWith('sort', 'rating')
  })

  it('offers the clear only when something is filtered', () => {
    const { resetFilters } = renderDrawer({ hasActiveFilters: true })

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(resetFilters).toHaveBeenCalledWith(['q', 'genre', 'rating', 'decade'])
  })

  it('hides the clear when nothing is filtered', () => {
    renderDrawer({ hasActiveFilters: false })
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  // The drawer leans on lib/useModal for this rather than carrying its own
  // trap, so this is the check that it is actually wired up.
  it('closes on Escape', () => {
    const { onClose } = renderDrawer()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
