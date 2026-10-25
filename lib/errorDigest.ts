/**
 * The digest Next attaches to an error forwarded from a Server Component —
 * the reference that matches the server-side log line.
 *
 * Next 16.3 types an error boundary's `error` as `unknown`, because a value
 * thrown in a Client Component reaches the boundary as-is and need not be an
 * Error at all. Reading `.digest` straight off it is a crash waiting for the
 * first `throw 'string'`, so it is narrowed here once for every boundary.
 */
export function errorDigest(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('digest' in error)) return undefined
  const { digest } = error as { digest?: unknown }
  return typeof digest === 'string' && digest !== '' ? digest : undefined
}
