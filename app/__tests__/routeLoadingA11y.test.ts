import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..')

/** Every loading.tsx under app, repo-relative. */
function loadingFiles(): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue
      const full = join(dir, name)
      if (statSync(full).isDirectory()) walk(full)
      else if (name === 'loading.tsx') found.push(relative(root, full).split(sep).join('/'))
    }
  }
  walk(join(root, 'app'))
  return found
}

describe('route loading states', () => {
  // Skeleton is aria-hidden, so a fallback built only out of them exposes no
  // content at all: a screen reader navigating to /library heard silence
  // until the data landed (WCAG 4.1.3). Eleven of the twelve were like this.
  it('announces itself as a busy status region with a visually hidden label', () => {
    const files = loadingFiles()
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const source = readFileSync(join(root, ...file.split('/')), 'utf8')
      expect(source, `${file} has no role="status"`).toContain('role="status"')
      expect(source, `${file} has no aria-busy`).toContain('aria-busy="true"')
      // The label is the only thing in the subtree with an accessible name.
      expect(source, `${file} has no sr-only label`)
        .toMatch(/<span className="sr-only">Loading[^<]*…<\/span>/)
    }
  })
})
