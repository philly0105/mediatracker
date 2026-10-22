import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import path from 'path'

// Spatial Glass replaced the Autumn Pine palette and the Outfit typeface. The
// tokens re-theme every `var(--…)` and bridged Tailwind utility at the source;
// what they cannot reach is a literal written into a source file — an icon
// route's hex fill, a manifest theme colour, an inline `rgba(255,255,255,…)`
// hairline. Those render the old theme (or cold white) on the new canvas, so
// the guard is on the literal.
//
// The white check is .ts/.tsx only: the token files under app/styles are the
// one place the white-alpha values are meant to be written, and components
// reach them as `--glass-*`, `--border-*` and `--glass-fill-*`. The OG card is
// the exception: Satori resolves no CSS variables, so it carries its own copy
// of the palette as literals.

const ROOT = path.resolve(__dirname, '../..')
const DIRS = ['app', 'components', 'lib']
const SOURCE_EXT = new Set(['.ts', '.tsx', '.css'])
const CODE_EXT = new Set(['.ts', '.tsx'])

// No trailing \b: an 8-digit alpha form like #7c9a6a80 has no word boundary
// after the sixth digit and would slip past the guard.
const AUTUMN_PINE = /#(?:100e09|15120c|1b1711|7c9a6a|c4805f|d3a85c)/i
const OUTFIT = /Outfit/
const RAW_WHITE = /rgba\(\s*255\s*,\s*255\s*,\s*255/
const SATORI_RENDERED = new Set([path.join('lib', 'ogCard.tsx')])

function sources(dir: string, ext: Set<string>): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      return name === 'node_modules' || name === '__tests__' ? [] : sources(full, ext)
    }
    return ext.has(path.extname(name)) ? [full] : []
  })
}

function offenders(ext: Set<string>, pattern: RegExp): string[] {
  return DIRS.flatMap((d) => sources(path.join(ROOT, d), ext))
    .filter((f) => pattern.test(readFileSync(f, 'utf8')))
    .map((f) => path.relative(ROOT, f))
}

describe('spatial glass palette', () => {
  it('has no Autumn Pine colour literals left in app source', () => {
    expect(offenders(SOURCE_EXT, AUTUMN_PINE)).toEqual([])
  })

  it('no longer names the Outfit typeface anywhere in app source', () => {
    expect(offenders(SOURCE_EXT, OUTFIT)).toEqual([])
  })

  it('has no raw white rgba literals in components or routes', () => {
    expect(offenders(CODE_EXT, RAW_WHITE).filter((f) => !SATORI_RENDERED.has(f))).toEqual([])
  })

  it('still bridges Tailwind’s white to the top of the ramp', () => {
    // Every `text-white` / `bg-white/x` utility lands on --zinc-100 only
    // because of this line; without it they go back to #ffffff.
    const globals = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')
    expect(globals).toMatch(/--color-white:\s*var\(--zinc-100\)/)
  })
})
