import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'

// The design system is authored in .agents/skills/dorfmovies-design/ and vendored
// into app/styles/design-system/, which is what the build actually imports (F-31).
// Two copies drift silently: a token retuned in the skill alone would leave the app
// rendering stale values with nothing to catch it. This fails instead.
const skill = path.resolve(__dirname, '../../../../.agents/skills/dorfmovies-design')
const vendored = path.resolve(__dirname, '..')

const normalizeEol = (s: string) => s.replace(/\r\n/g, '\n')

describe('design system vendored copy', () => {
  it('ships the same token files as the skill', () => {
    const inSkill = readdirSync(path.join(skill, 'tokens')).filter(f => f.endsWith('.css')).sort()
    const inApp = readdirSync(path.join(vendored, 'tokens')).filter(f => f.endsWith('.css')).sort()
    expect(inApp).toEqual(inSkill)
  })

  it.each(
    readdirSync(path.join(skill, 'tokens')).filter(f => f.endsWith('.css')).sort(),
  )('tokens/%s is byte-identical to the skill', file => {
    expect(normalizeEol(readFileSync(path.join(vendored, 'tokens', file), 'utf8'))).toBe(
      normalizeEol(readFileSync(path.join(skill, 'tokens', file), 'utf8')),
    )
  })

  it('styles.css is byte-identical to the skill', () => {
    expect(normalizeEol(readFileSync(path.join(vendored, 'styles.css'), 'utf8'))).toBe(
      normalizeEol(readFileSync(path.join(skill, 'styles.css'), 'utf8')),
    )
  })
})
