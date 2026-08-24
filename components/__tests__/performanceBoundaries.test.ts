import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (name: string) => readFileSync(join(__dirname, '..', name), 'utf8')

describe('authenticated shell bundle boundaries', () => {
  it('loads shortcut panels through next/dynamic', () => {
    const value = source('KeyboardShortcuts.tsx')
    expect(value).toContain("from 'next/dynamic'")
    expect(value).toContain("import('@/components/SearchOverlay')")
    expect(value).toContain("import('@/components/KeyboardHelp')")
  })

  it('keeps modal implementation out of the provider module', () => {
    const value = source('MediaModalProvider.tsx')
    expect(value).toContain("import('./MediaModalStack')")
    expect(value).not.toMatch(/^import .*MediaInfoModal/m)
    expect(value).not.toContain("from 'framer-motion'")
  })
})
