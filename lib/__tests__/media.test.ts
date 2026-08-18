import { describe, it, expect } from 'vitest'
import { upsertMedia } from '@/lib/media'

describe('upsertMedia', () => {
  it('is exported and callable', () => {
    expect(typeof upsertMedia).toBe('function')
  })
})
