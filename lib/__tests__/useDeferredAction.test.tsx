import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDeferredAction } from '@/lib/useDeferredAction'

describe('useDeferredAction', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('runs the action only after the delay elapses', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useDeferredAction(6000))

    act(() => { result.current.schedule('a', run) })
    expect(run).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(5999) })
    expect(run).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(1) })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('cancel prevents the action entirely', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useDeferredAction(6000))

    act(() => { result.current.schedule('a', run) })
    let cancelled = false
    act(() => { cancelled = result.current.cancel('a') })

    expect(cancelled).toBe(true)
    act(() => { vi.advanceTimersByTime(60000) })
    expect(run).not.toHaveBeenCalled()
  })

  it('cancel reports false for a key that is not pending', () => {
    const { result } = renderHook(() => useDeferredAction(6000))
    let cancelled = true
    act(() => { cancelled = result.current.cancel('nope') })
    expect(cancelled).toBe(false)
  })

  it('cancelling one key leaves the others pending', () => {
    const a = vi.fn()
    const b = vi.fn()
    const { result } = renderHook(() => useDeferredAction(6000))

    act(() => {
      result.current.schedule('a', a)
      result.current.schedule('b', b)
    })
    act(() => { result.current.cancel('a') })
    act(() => { vi.advanceTimersByTime(6000) })

    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('rescheduling the same key supersedes the earlier action', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { result } = renderHook(() => useDeferredAction(6000))

    act(() => { result.current.schedule('a', first) })
    act(() => { vi.advanceTimersByTime(3000) })
    act(() => { result.current.schedule('a', second) })
    act(() => { vi.advanceTimersByTime(6000) })

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('flushes pending actions on unmount so navigating away still commits', () => {
    const run = vi.fn()
    const { result, unmount } = renderHook(() => useDeferredAction(6000))

    act(() => { result.current.schedule('a', run) })
    expect(run).not.toHaveBeenCalled()

    unmount()
    expect(run).toHaveBeenCalledTimes(1)

    // And the cleared timer must not fire it a second time.
    act(() => { vi.advanceTimersByTime(60000) })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('does not flush an action that was cancelled before unmount', () => {
    const run = vi.fn()
    const { result, unmount } = renderHook(() => useDeferredAction(6000))

    act(() => { result.current.schedule('a', run) })
    act(() => { result.current.cancel('a') })
    unmount()

    expect(run).not.toHaveBeenCalled()
  })
})
