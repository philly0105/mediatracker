import type { MediaType } from '@/types'

// TMDB numbers movies and shows in separate namespaces, so the same integer can
// be both. Anything keying media by id alone will confuse the two — the database
// learned this in migration 009 (unique on tmdb_id, type) and the client sets in
// lib/useLibraryIds.ts key through here for the same reason.
//
// Deliberately its own module rather than living beside the hook: the route
// handler at app/api/library/ids builds the same keys, and importing a value
// from a 'use client' module into server code hands back a client reference.
export function mediaKey(type: MediaType, tmdbId: number): string {
  return `${type}:${tmdbId}`
}
