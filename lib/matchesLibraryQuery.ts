import type { WatchEntry } from '@/types'

// Library search used to compare against the title alone, even though director,
// cast_members and genres are all already on the row — so searching your own
// library for "Fincher" or "Pedro Pascal" returned nothing.
//
// Terms are AND-ed and each may match any field, so "fincher 2014" finds Gone
// Girl and "pascal drama" narrows within one actor. Matching is substring-based
// rather than prefix- or word-based, which is what makes partial actor names
// work without an index.
export function matchesLibraryQuery(entry: WatchEntry, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true

  const media = entry.media
  if (!media) return false

  const haystacks = [
    media.title,
    media.director ?? '',
    String(media.release_year ?? ''),
    ...(media.cast_members ?? []),
    ...(media.genres ?? []),
  ].map((value) => value.toLowerCase())

  return terms.every((term) => haystacks.some((haystack) => haystack.includes(term)))
}
