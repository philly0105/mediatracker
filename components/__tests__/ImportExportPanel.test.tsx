import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ImportExportPanel from '@/components/ImportExportPanel'

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement
}

function choose(container: HTMLElement, name: string, body: string) {
  fireEvent.change(fileInput(container), { target: { files: [new File([body], name, { type: 'text/csv' })] } })
}

const EXPORT = 'title,year,type,rating,date,review,status\nSinners,2025,movie,5,2025-04-18,"Loved it.\nSecond watch was even better.",watched'

describe('ImportExportPanel file handling', () => {
  it('loads an export whose review spans two lines as one row', async () => {
    const { container } = render(<ImportExportPanel />)
    choose(container, 'dorfmovies-2026-01-01.csv', EXPORT)

    expect(await screen.findByText(/1 rows loaded/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('accepts an uppercase .CSV', async () => {
    const { container } = render(<ImportExportPanel />)
    choose(container, 'LIBRARY.CSV', EXPORT)

    expect(await screen.findByText(/1 rows loaded/)).toBeInTheDocument()
  })

  it('says why it will not read a file that is not a CSV', () => {
    // This used to `return` in silence, which looks exactly like a file that
    // loaded and held nothing.
    const { container } = render(<ImportExportPanel />)
    choose(container, 'library.tsv', EXPORT)

    expect(screen.getByRole('alert')).toHaveTextContent('That needs to be a .csv file')
    expect(screen.queryByText(/rows loaded/)).not.toBeInTheDocument()
  })

  it('says so when a readable file has no rows in it', async () => {
    const { container } = render(<ImportExportPanel />)
    choose(container, 'empty.csv', 'title,year,type,rating,date,review,status\n')

    expect(await screen.findByRole('alert')).toHaveTextContent('found no rows')
  })

  it('names the line of an unclosed quote and offers nothing to import', async () => {
    const { container } = render(<ImportExportPanel />)
    choose(container, 'hand-made.csv', 'title,review\nSinners,"Loved it\nWeapons,fine')

    expect(await screen.findByRole('alert')).toHaveTextContent('Line 2 opens a quoted field that never closes')
    expect(screen.queryByText(/rows loaded/)).not.toBeInTheDocument()
  })

  it('says so when the file cannot be read at all', async () => {
    // onerror had no handler, so a read failure did nothing whatsoever.
    class FailingFileReader {
      onerror: (() => void) | null = null
      onload: (() => void) | null = null
      readAsText() { queueMicrotask(() => this.onerror?.()) }
    }
    vi.stubGlobal('FileReader', FailingFileReader)

    const { container } = render(<ImportExportPanel />)
    choose(container, 'library.csv', EXPORT)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent("couldn't be read"))
  })

  it('clears the message when a good file follows a bad one', async () => {
    const { container } = render(<ImportExportPanel />)
    choose(container, 'library.txt', EXPORT)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    choose(container, 'library.csv', EXPORT)
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
