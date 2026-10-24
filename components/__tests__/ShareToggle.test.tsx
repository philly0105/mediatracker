import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ShareToggle from '../ShareToggle'
import { ToastProvider } from '../ToastProvider'

const mockFetch = vi.fn()

function renderToggle(token: string | null) {
  // ShareToggle reports every outcome through useToast, so it needs the same
  // provider app/layout.tsx wraps the page in.
  return render(
    <ToastProvider>
      <ShareToggle
        label="Watched History"
        type="watched"
        token={token}
        shareUrl={token ? `http://localhost:3000/share/watched/${token}` : null}
      />
    </ToastProvider>
  )
}

const switchFor = () => screen.getByRole('switch', { name: /toggle public sharing/i })

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
  // The failure paths log the cause; nothing is asserted on it and the noise
  // buries the real test output.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ShareToggle enabling', () => {
  it('turns the switch on and shows the minted link', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'tok-new' }) })
    renderToggle(null)

    expect(switchFor()).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(switchFor())

    await waitFor(() => expect(switchFor()).toHaveAttribute('aria-checked', 'true'))
    expect(mockFetch).toHaveBeenCalledWith('/api/settings/share', expect.objectContaining({ method: 'POST' }))
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ type: 'watched', enabled: true })

    const input = screen.getByLabelText('Watched History public share URL') as HTMLInputElement
    expect(input.value).toBe(`${window.location.origin}/share/watched/tok-new`)
    expect(screen.getByText(/Anyone with this link can see this list/)).toBeInTheDocument()
  })

  it('does not ask for confirmation on the way on', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'tok-new' }) })
    renderToggle(null)

    fireEvent.click(switchFor())
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})

describe('ShareToggle disabling', () => {
  it('turns the switch off once confirmed and says the old link is dead', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ token: null }) })
    renderToggle('tok-old')

    fireEvent.click(switchFor())

    await waitFor(() => expect(switchFor()).toHaveAttribute('aria-checked', 'false'))
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ type: 'watched', enabled: false })
    expect(screen.queryByLabelText('Watched History public share URL')).not.toBeInTheDocument()
    expect(await screen.findByText('Sharing is off. The old link no longer works.')).toBeInTheDocument()
  })

  it('leaves sharing on when the confirmation is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderToggle('tok-old')

    fireEvent.click(switchFor())

    expect(mockFetch).not.toHaveBeenCalled()
    expect(switchFor()).toHaveAttribute('aria-checked', 'true')
  })
})

describe('ShareToggle failure handling', () => {
  // The whole point of the fix: the switch may never claim sharing is off
  // while the server is still serving the list at the public URL.
  it('keeps the switch on when the request is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) })
    renderToggle('tok-old')

    fireEvent.click(switchFor())

    expect(await screen.findByText('Could not update sharing — your link is unchanged.')).toBeInTheDocument()
    expect(switchFor()).toHaveAttribute('aria-checked', 'true')
    const input = screen.getByLabelText('Watched History public share URL') as HTMLInputElement
    expect(input.value).toBe('http://localhost:3000/share/watched/tok-old')
  })

  it('keeps the switch on when the body is not JSON', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    // A platform 502 answers 200-shaped HTML often enough that res.json()
    // rejecting has to be a handled case, not an unhandled rejection.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON') },
    })
    renderToggle('tok-old')

    fireEvent.click(switchFor())

    expect(await screen.findByText('Could not update sharing — your link is unchanged.')).toBeInTheDocument()
    expect(switchFor()).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps the switch off when enabling comes back without a token', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    renderToggle(null)

    fireEvent.click(switchFor())

    expect(await screen.findByText('Could not update sharing — your link is unchanged.')).toBeInTheDocument()
    expect(switchFor()).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByLabelText('Watched History public share URL')).not.toBeInTheDocument()
  })

  it('sends one upsert for a double click', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    mockFetch.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve }))
    renderToggle(null)

    fireEvent.click(switchFor())
    fireEvent.click(switchFor())
    expect(mockFetch).toHaveBeenCalledTimes(1)

    resolveFetch({ ok: true, json: async () => ({ token: 'tok-new' }) })
    await waitFor(() => expect(switchFor()).toHaveAttribute('aria-checked', 'true'))
  })
})
