import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = (name: string) => readFileSync(join(__dirname, '..', name), 'utf8')

describe('authenticated shell bundle boundaries', () => {
  it('loads shortcut panels host through next/dynamic without framer or direct panel imports', () => {
    const value = source('KeyboardShortcuts.tsx')
    expect(value).toContain("from 'next/dynamic'")
    expect(value).toContain("import('@/components/KeyboardShortcutPanels')")
    expect(value).not.toContain("from 'framer-motion'")
    expect(value).not.toContain("import('@/components/SearchOverlay')")
    expect(value).not.toContain("import('@/components/KeyboardHelp')")
  })

  it('keeps modal implementation out of the provider module without eager test fallbacks', () => {
    const value = source('MediaModalProvider.tsx')
    expect(value).toContain("import('./MediaModalStack')")
    expect(value).not.toMatch(/^import .*MediaInfoModal/m)
    expect(value).not.toContain("from 'framer-motion'")
    expect(value).not.toContain('import.meta.glob')
    expect(value).not.toContain('process.env.NODE_ENV')
    expect(value).not.toContain('TestMediaModalStack')
  })

  it('owns AnimatePresence and panel imports inside KeyboardShortcutPanels', () => {
    const value = source('KeyboardShortcutPanels.tsx')
    expect(value).toContain("from 'framer-motion'")
    expect(value).toMatch(/import\s+SearchOverlay\s+from\s+['"]@\/components\/SearchOverlay['"]/)
    expect(value).toMatch(/import\s+KeyboardHelp\s+from\s+['"]@\/components\/KeyboardHelp['"]/)
    expect(value).toMatch(/<AnimatePresence[\s\S]*<KeyboardHelp/)
  })
})
