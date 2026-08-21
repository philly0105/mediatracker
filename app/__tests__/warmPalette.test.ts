import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

// F-22's remainder. The `--color-white: var(--zinc-100)` bridge in globals.css
// retunes every `text-white` / `bg-white/x` Tailwind utility at its source, so
// those call sites are fine and deliberately left alone. What the bridge cannot
// reach is a literal `rgba(255,255,255,…)` in an inline style or an SVG
// attribute — those stayed cold white on a warm canvas until they were swept to
// `--btn-ghost-bg` / `--border-*` / `--surface-input`.
//
// The audit asked for a rule so they cannot come back. An ESLint ban on `-white`
// class names would flag the ~230 intentional utilities instead, so the guard is
// on the literal.

const ROOT = path.resolve(__dirname, '../..')
const DIRS = ['app', 'components', 'lib']
const EXT = new Set(['.ts', '.tsx', '.css'])
const COLD_WHITE = /rgba\(\s*255\s*,\s*255\s*,\s*255/

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      return name === 'node_modules' || name === '__tests__' ? [] : sources(full)
    }
    return EXT.has(path.extname(name)) ? [full] : []
  })
}

describe('warm palette', () => {
  it('has no cold-white rgba literals left in app source', () => {
    const offenders = DIRS.flatMap((d) => sources(path.join(ROOT, d)))
      .filter((f) => COLD_WHITE.test(readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f))

    expect(offenders).toEqual([])
  })

  it('still bridges Tailwind’s white to the warm ramp', () => {
    // The sweep above is only safe because this line exists — without it the
    // ~230 `text-white` utilities the audit counted go back to #ffffff.
    const globals = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')
    expect(globals).toMatch(/--color-white:\s*var\(--zinc-100\)/)
  })
})
