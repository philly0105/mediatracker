import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

describe('Next production configuration', () => {
  it('pins Turbopack to this repository', () => {
    expect(nextConfig.turbopack?.root).toBe(process.cwd())
  })
})
