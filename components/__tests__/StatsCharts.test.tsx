import { describe, it, expect } from 'vitest'
import { highlightIndex } from '../StatsCharts'

describe('highlightIndex', () => {
  const now = new Date(2026, 9, 22)

  it('picks the current month when it is in the window', () => {
    const rows = [
      { month: '2026-08', total: 40 },
      { month: '2026-09', total: 12 },
      { month: '2026-10', total: 3 },
    ]
    expect(highlightIndex(rows, now)).toBe(2)
  })

  it('falls back to the peak month for a past year', () => {
    const rows = [
      { month: '2025-01', total: 4 },
      { month: '2025-02', total: 19 },
      { month: '2025-03', total: 7 },
    ]
    expect(highlightIndex(rows, now)).toBe(1)
  })

  it('returns -1 when nothing was logged', () => {
    expect(highlightIndex([{ month: '2025-01', total: 0 }], now)).toBe(-1)
    expect(highlightIndex([], now)).toBe(-1)
  })
})
