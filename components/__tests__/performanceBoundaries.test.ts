import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..')
const source = (name: string) => readFileSync(join(__dirname, '..', name), 'utf8')
const readSource = (relPath: string) => readFileSync(join(root, ...relPath.split('/')), 'utf8')

describe('authenticated shell bundle boundaries', () => {
  it('does not import framer-motion or MotionProvider in synchronous signed-in routes and shell components', () => {
    const synchronousFiles = [
      'app/layout.tsx',
      'app/(app)/layout.tsx',
      'components/Sidebar.tsx',
      'components/MultiSelectProvider.tsx',
      'components/ui/BentoGrid.tsx',
      'components/ui/SegmentedControl.tsx',
      'components/CalendarClient.tsx',
      'app/(app)/streaming/page.tsx',
      'app/(app)/watchlist/page.tsx',
    ]

    for (const file of synchronousFiles) {
      const content = readSource(file)
      expect(content, `Expected ${file} not to import from framer-motion`).not.toContain("from 'framer-motion'")
      expect(content, `Expected ${file} not to reference MotionProvider`).not.toContain('MotionProvider')
    }
  })

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

  it('owns AnimatePresence, MotionConfig, and panel imports inside KeyboardShortcutPanels', () => {
    const value = source('KeyboardShortcutPanels.tsx')
    expect(value).toContain("from 'framer-motion'")
    expect(value).toContain('MotionConfig')
    expect(value).toContain('reducedMotion="user"')
    expect(value).toMatch(/import\s+SearchOverlay\s+from\s+['"]@\/components\/SearchOverlay['"]/)
    expect(value).toMatch(/import\s+KeyboardHelp\s+from\s+['"]@\/components\/KeyboardHelp['"]/)
    expect(value).toMatch(/<MotionConfig[\s\S]*<AnimatePresence[\s\S]*<KeyboardHelp/)
  })

  it('owns AnimatePresence, MotionConfig, and MediaInfoModal inside MediaModalStack', () => {
    const value = source('MediaModalStack.tsx')
    expect(value).toContain("from 'framer-motion'")
    expect(value).toContain('MotionConfig')
    expect(value).toContain('reducedMotion="user"')
    expect(value).toContain('MediaInfoModal')
    expect(value).toMatch(/<MotionConfig[\s\S]*<AnimatePresence[\s\S]*<MediaInfoModal/)
  })

  it('wraps TonightPickModal with MotionConfig reducedMotion="user"', () => {
    const value = source('TonightPickModal.tsx')
    expect(value).toContain("from 'framer-motion'")
    expect(value).toContain('MotionConfig')
    expect(value).toContain('reducedMotion="user"')
  })

  it('lazy-loads TonightPickModal via next/dynamic at module scope in watchlist page', () => {
    const content = readSource('app/(app)/watchlist/page.tsx')
    expect(content).toContain("from 'next/dynamic'")
    expect(content).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\(['"]@\/components\/TonightPickModal['"]\)\s*\)/)
  })

  it('removes components/MotionProvider.tsx since no production import remains', () => {
    const motionProviderPath = join(__dirname, '..', 'MotionProvider.tsx')
    expect(existsSync(motionProviderPath)).toBe(false)
  })
})
