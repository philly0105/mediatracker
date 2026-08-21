import { describe, it, expect } from 'vitest'
import { poolSettled } from '../pool'

describe('poolSettled', () => {
  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0
    let peak = 0
    const items = Array.from({ length: 20 }, (_, i) => i)

    await poolSettled(items, 4, async () => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((r) => setTimeout(r, 1))
      inFlight--
    })

    expect(peak).toBe(4)
  })

  it('keeps input order and isolates failures', async () => {
    const results = await poolSettled([1, 2, 3, 4], 2, async (n) => {
      if (n % 2 === 0) throw new Error(`no ${n}`)
      return n * 10
    })

    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected', 'fulfilled', 'rejected'])
    expect(results[0]).toMatchObject({ value: 10 })
    expect(results[2]).toMatchObject({ value: 30 })
  })

  it('reports progress once per item and handles an empty list', async () => {
    const seen: number[] = []
    await poolSettled([1, 2, 3], 2, async (n) => n, (done) => seen.push(done))
    expect(seen).toEqual([1, 2, 3])

    await expect(poolSettled([], 4, async () => 1)).resolves.toEqual([])
  })
})
