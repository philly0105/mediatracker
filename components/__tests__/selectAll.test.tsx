import type { HTMLAttributes, ReactNode } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MultiSelectProvider, useMultiSelect } from '../MultiSelectProvider'
import SelectableOverlay from '../SelectableOverlay'
import { ToastProvider } from '../ToastProvider'
import type { TmdbSearchResult } from '@/types'

type MotionDivProps = HTMLAttributes<HTMLDivElement> & {
  initial?: unknown; animate?: unknown; exit?: unknown; transition?: unknown
}
function strip({ ...p }: MotionDivProps): HTMLAttributes<HTMLDivElement> {
  delete p.initial; delete p.animate; delete p.exit; delete p.transition
  return p
}
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  motion: { div: (props: MotionDivProps) => <div {...strip(props)} /> },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

function item(id: number, title: string): TmdbSearchResult {
  return { tmdb_id: id, type: 'movie', title, overview: '', poster_url: null, release_year: 2020 }
}

function Count() {
  const { selectedItems, selectableCount } = useMultiSelect()
  return <div data-testid="counts">{selectedItems.size}/{selectableCount}</div>
}

function Harness({ items }: { items: TmdbSearchResult[] }) {
  return (
    <ToastProvider>
      <MultiSelectProvider>
        <Count />
        {items.map((it) => (
          <SelectableOverlay key={it.tmdb_id} item={it}>
            <div>{it.title}</div>
          </SelectableOverlay>
        ))}
        {/* A row whose media join is missing must not be selectable at all. */}
        <SelectableOverlay item={null}><div>orphan</div></SelectableOverlay>
      </MultiSelectProvider>
    </ToastProvider>
  )
}

const three = [item(1, 'Heat'), item(2, 'Sicario'), item(3, 'Prisoners')]

describe('select all', () => {
  it('counts every selectable card and ignores rows with no media', () => {
    render(<Harness items={three} />)
    expect(screen.getByTestId('counts').textContent).toBe('0/3')
  })

  it('selects everything on the page from one click', () => {
    render(<Harness items={three} />)

    // The bar only appears once something is selected.
    act(() => { fireEvent.click(screen.getAllByRole('button')[0]) })
    expect(screen.getByTestId('counts').textContent).toBe('1/3')

    act(() => { fireEvent.click(screen.getByText('Select all 3')) })
    expect(screen.getByTestId('counts').textContent).toBe('3/3')
  })

  it('hides the button once everything is already selected', () => {
    render(<Harness items={three} />)
    act(() => { fireEvent.click(screen.getAllByRole('button')[0]) })
    act(() => { fireEvent.click(screen.getByText('Select all 3')) })

    expect(screen.queryByText(/Select all/)).not.toBeInTheDocument()
  })

  it('drops unmounted cards from the count', () => {
    const { rerender } = render(<Harness items={three} />)
    expect(screen.getByTestId('counts').textContent).toBe('0/3')

    // Filtering a list down must not leave the removed cards selectable.
    rerender(<Harness items={three.slice(0, 1)} />)
    expect(screen.getByTestId('counts').textContent).toBe('0/1')
  })
})
