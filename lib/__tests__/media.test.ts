import { describe, it, expect, vi } from 'vitest'
import { upsertMedia } from '@/lib/media'

describe('upsertMedia', () => {
  it('is exported and callable', () => {
    expect(typeof upsertMedia).toBe('function')
  })
})
