import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'fs'
import path from 'path'

const appDir = path.resolve(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(appDir)
const ogRoutes = files.filter(f => path.basename(f) === 'opengraph-image.tsx')

describe('open graph image routes', () => {
  // These are the routes that get pasted somewhere: the two deep-linkable
  // detail pages, the franchise page, both share links, and the app-wide
  // default every other route inherits.
  it.each([
    ['app', ''],
    ['show/[id]', '(app)/show/[id]'],
    ['person/[name]', '(app)/person/[name]'],
    ['collections/[id]', '(app)/collections/[id]'],
    ['share/watched/[token]', '(public)/share/watched/[token]'],
    ['share/watchlist/[token]', '(public)/share/watchlist/[token]'],
  ])('%s has a card', (_label, segment) => {
    expect(existsSync(path.join(appDir, segment, 'opengraph-image.tsx'))).toBe(true)
  })

  // The trap this guards: an `openGraph.images` in a segment's own metadata
  // silently wins over that segment's opengraph-image.tsx, so the generated
  // card is built, served, and never referenced by any og:image tag. Next's
  // own docs claim the file wins; in 16.2 it does not.
  it.each(ogRoutes.map(f => [path.relative(appDir, path.dirname(f)) || '.', path.dirname(f)]))(
    '%s does not also set openGraph.images in metadata',
    (_label, dir) => {
      for (const sibling of ['page.tsx', 'layout.tsx']) {
        const file = path.join(dir, sibling)
        if (!existsSync(file)) continue
        // Comments mentioning `images` are fine; a real key is not.
        const source = readFileSync(file, 'utf8').replace(/\/\/.*$/gm, '')
        expect(source).not.toMatch(/^\s*images:/m)
      }
    },
  )
})
