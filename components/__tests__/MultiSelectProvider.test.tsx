import type { ReactNode } from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MultiSelectProvider, useMultiSelect, selectionKey } from '../MultiSelectProvider'
import { ToastProvider } from '../ToastProvider'
import { useModal } from '@/lib/useModal'
import type { TmdbSearchResult } from '@/types'

// selectAll.test.tsx covers the registration count through SelectableOverlay.
// This file covers the rest of the provider's contract: what Escape does to a
// selection, and what the pooled batch write does with partial failure — the
// two places where getting it wrong loses the user's work rather than just
// looking wrong.

const refresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}))

function item(id: number, title: string): TmdbSearchResult {
  return { tmdb_id: id, type: 'movie', title, overview: '', poster_url: null, release_year: 2020 }
}

/** Registers and selects through the context directly, without a card tree. */
function Rig({ items, registered }: { items: TmdbSearchResult[]; registered?: TmdbSearchResult[] }) {
  const { selectedItems, toggleSelection, register, unregister, selectAll, selectableCount } = useMultiSelect()
  const toRegister = registered ?? items
  return (
    <div>
      <div data-testid="selected">{selectedItems.size}</div>
      <div data-testid="registerable">{selectableCount}</div>
      <button onClick={() => toRegister.forEach(i => register(selectionKey(i), i))}>register</button>
      <button onClick={() => items.forEach(i => unregister(selectionKey(i)))}>unregister all</button>
      <button onClick={selectAll}>select all rows</button>
      {items.map(i => (
        <button key={i.tmdb_id} onClick={() => toggleSelection(i)}>pick {i.title}</button>
      ))}
    </div>
  )
}

function Dialog() {
  const { containerRef } = useModal(() => {})
  return <div ref={containerRef} role="dialog"><button>in modal</button></div>
}

function mount(ui: ReactNode) {
  return render(<ToastProvider><MultiSelectProvider>{ui}</MultiSelectProvider></ToastProvider>)
}

const three = [item(1, 'Heat'), item(2, 'Sicario'), item(3, 'Prisoners')]

describe('MultiSelectProvider keyboard', () => {
  beforeEach(() => { refresh.mockReset() })

  it('clears a selection on Escape', () => {
    mount(<Rig items={three} />)
    fireEvent.click(screen.getByText('pick Heat'))
    fireEvent.click(screen.getByText('pick Sicario'))
    expect(screen.getByTestId('selected')).toHaveTextContent('2')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByTestId('selected')).toHaveTextContent('0')
  })

  it('leaves the selection alone while a modal is open', () => {
    mount(<><Rig items={three} /><Dialog /></>)
    fireEvent.click(screen.getByText('pick Heat'))

    // The modal's own Escape handler has the stronger claim; clearing the
    // selection out from under it would lose it on a keypress meant for the
    // dialog.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByTestId('selected')).toHaveTextContent('1')
  })
})

describe('MultiSelectProvider registration lifecycle', () => {
  it('selects only what is still registered', () => {
    mount(<Rig items={three} />)
    fireEvent.click(screen.getByText('register'))
    expect(screen.getByTestId('registerable')).toHaveTextContent('3')

    fireEvent.click(screen.getByText('unregister all'))
    fireEvent.click(screen.getByText('pick Heat'))
    fireEvent.click(screen.getByText('select all rows'))

    // Filtering a list down and hitting "select all" must not resurrect the
    // cards that left the page.
    expect(screen.getByTestId('selected')).toHaveTextContent('0')
  })

  it('does not double-count a card that registers twice under the same key', () => {
    mount(<Rig items={three} />)
    fireEvent.click(screen.getByText('register'))
    fireEvent.click(screen.getByText('register'))
    expect(screen.getByTestId('registerable')).toHaveTextContent('3')
  })
})

describe('MultiSelectProvider batch actions', () => {
  beforeEach(() => {
    refresh.mockReset()
  })

  function selectTwo() {
    mount(<Rig items={three} />)
    fireEvent.click(screen.getByText('pick Heat'))
    fireEvent.click(screen.getByText('pick Sicario'))
  }

  it('writes once per selected item, then clears and refreshes', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(null, { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
    selectTwo()

    await act(async () => { fireEvent.click(screen.getByText('Add to Watchlist')) })

    const posts = fetchMock.mock.calls.filter(([url]) => url === '/api/watchlist')
    expect(posts).toHaveLength(2)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('0'))
    expect(refresh).toHaveBeenCalled()
  })

  it('reports the failures and still clears when some succeeded', async () => {
    let call = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      call += 1
      return new Response(null, { status: call === 1 ? 200 : 500 })
    }))
    selectTwo()

    await act(async () => { fireEvent.click(screen.getByText('Add to Watchlist')) })

    expect(await screen.findByText(/1 failed/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('0'))
  })

  it('keeps the selection when every write failed, so it can be retried', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })))
    selectTwo()

    await act(async () => { fireEvent.click(screen.getByText('Add to Watchlist')) })

    expect(await screen.findByText(/Could not add those items/)).toBeInTheDocument()
    expect(screen.getByTestId('selected')).toHaveTextContent('2')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('deletes the watchlist row after marking an item watched', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response(null, { status: 200 })
    )
    vi.stubGlobal('fetch', fetchMock)
    mount(<Rig items={three} />)
    fireEvent.click(screen.getByText('pick Heat'))

    await act(async () => { fireEvent.click(screen.getByText('Mark as Watched')) })

    const methods = fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`)
    expect(methods).toEqual(['POST /api/watch', 'DELETE /api/watchlist'])
  })
})

describe('MultiSelectProvider action bar toolbar', () => {
  it('renders the floating action bar with toolbar role when in select mode', () => {
    mount(<Rig items={three} />)
    expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).toBeNull()

    fireEvent.click(screen.getByText('pick Heat'))
    const toolbar = screen.getByRole('toolbar', { name: 'Bulk actions' })
    expect(toolbar).toBeInTheDocument()
    expect(toolbar).toHaveClass('motion-toolbar-up')

    fireEvent.click(screen.getByLabelText('Clear selection'))
    expect(screen.queryByRole('toolbar', { name: 'Bulk actions' })).toBeNull()
  })
})
