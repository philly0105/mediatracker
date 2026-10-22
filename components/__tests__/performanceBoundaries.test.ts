import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..')
const source = (name: string) => readFileSync(join(__dirname, '..', name), 'utf8')
const readSource = (relPath: string) => readFileSync(join(root, ...relPath.split('/')), 'utf8')

/** Every shipped .ts/.tsx under app, components and lib, repo-relative. */
function sourceFiles(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.tsx?$/.test(name)) found.push(relative(root, full).split(sep).join('/'))
    }
  }
  for (const dir of ['app', 'components', 'lib']) walk(join(root, dir))
  return found
}

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

  it('loads shortcut panels host through next/dynamic without direct panel imports', () => {
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

  it('owns the help sheet and its exit inside KeyboardShortcutPanels', () => {
    const value = source('KeyboardShortcutPanels.tsx')
    expect(value).toMatch(/import\s+SearchOverlay\s+from\s+['"]@\/components\/SearchOverlay['"]/)
    expect(value).toMatch(/import\s+KeyboardHelp\s+from\s+['"]@\/components\/KeyboardHelp['"]/)
    expect(value).toMatch(/<Presence[\s\S]*<\/Presence>/)
  })

  it('renders the modal stack through Presence so closing still animates out', () => {
    const value = source('MediaModalStack.tsx')
    expect(value).toContain('MediaInfoModal')
    expect(value).toMatch(/<Presence[^>]*onExitComplete/)
  })

  it('keeps framer-motion out of the app entirely', () => {
    // Every animation here was opacity + translate + scale, which CSS does for
    // free and off the main thread. The library was 140KB, duplicated into two
    // async chunks, so the first ⌘K and the first poster click each waited on a
    // download before anything moved.
    const pkg = JSON.parse(readSource('package.json'))
    expect(pkg.dependencies).not.toHaveProperty('framer-motion')
    expect(pkg.devDependencies ?? {}).not.toHaveProperty('framer-motion')

    for (const file of sourceFiles()) {
      expect(readSource(file), `Expected ${file} not to import framer-motion`)
        .not.toMatch(/(from|import\()\s*['"]framer-motion['"]/)
    }
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

  it('keeps client modules out of the route loading skeletons', () => {
    // A link prefetches a dynamic route up to its loading skeleton, and each
    // client component the skeleton renders makes the browser download the
    // route's whole client bundle with it: a Card in the settings skeleton
    // put the Supabase auth client on every page that links to /settings.
    // The walk follows local imports through every server module a skeleton
    // reaches, since a client module two imports down costs the same. Packages
    // are not followed: HomeSkeletons imports next/image but only renders it
    // from the page's fallback, never from loading.tsx.
    const resolveImport = (from: string, spec: string) => {
      const base = spec.startsWith('@/') ? spec.slice(2) : posix.join(posix.dirname(from), spec)
      return [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]
        .find((path) => existsSync(join(root, path)) && statSync(join(root, path)).isFile())
    }
    const loadingFiles = sourceFiles().filter((file) => file.startsWith('app/') && file.endsWith('/loading.tsx'))
    expect(loadingFiles.length).toBeGreaterThan(0)
    for (const loading of loadingFiles) {
      const seen = new Set<string>()
      const queue = [loading]
      while (queue.length > 0) {
        const file = queue.pop()!
        for (const [, spec] of readSource(file).matchAll(/^import (?!type )[^'"]*['"]([^'"]+)['"]/gm)) {
          if (!spec.startsWith('@/') && !spec.startsWith('.')) continue
          const target = resolveImport(file, spec)
          expect(target, `${file} imports ${spec}, which does not resolve`).toBeDefined()
          if (seen.has(target!)) continue
          seen.add(target!)
          expect(readSource(target!), `${loading} reaches the client module ${target} through ${file}`)
            .not.toMatch(/^\s*['"]use client['"]/)
          queue.push(target!)
        }
      }
    }
  })
})
