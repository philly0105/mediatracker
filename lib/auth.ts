import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Compares a supplied invite code against the configured one.
 *
 * Digests first, then compares: timingSafeEqual throws on length mismatch, so
 * comparing the raw strings would leak the code's length through the error and
 * the byte-by-byte comparison would leak its prefix through timing. SHA-256
 * digests are always 32 bytes, which makes the comparison genuinely constant
 * time over any input.
 *
 * Returns false when no code is configured — the caller is expected to treat an
 * unset SIGNUP_INVITE_CODE as "signup is off" rather than "everything passes".
 */
export function isValidInviteCode(supplied: unknown, expected: string | undefined): boolean {
  if (typeof supplied !== 'string' || !expected) return false
  const a = createHash('sha256').update(supplied).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

/**
 * Constrains a post-auth redirect to somewhere inside this app.
 *
 * The `next` parameter on /auth/callback comes back through an emailed link, so
 * it is attacker-influenced: without this, a crafted reset email could land a
 * freshly authenticated user on any site. Anything that is not a single-slash
 * relative path falls back to the home page. `//evil.com` and `https://evil.com`
 * are both protocol-relative or absolute and so are both rejected.
 */
export function safeNextPath(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string' || next === '') return fallback
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  // Backslashes are treated as slashes by some URL parsers, so /\evil.com can
  // read as a host in the same way //evil.com does.
  if (next.includes('\\')) return fallback
  return next
}
