import type { MetadataRoute } from 'next'

// DorfMovies is a private, single-user, invite-only tracker. Nothing in it
// belongs in a search index, so the default is Disallow and the root layout
// sets `robots: { index: false, follow: false }` as the authoritative signal.
//
// The carve-outs are not a loophole, they are what makes a pasted link look
// like anything. robots.txt governs *fetching*, not indexing, and the two have
// to be allowed together: a crawler told not to fetch /share/<token> never
// loads the page, never sees its noindex meta, and can still list the bare URL
// it found elsewhere. Allowing the fetch is what lets it read the noindex and
// drop the URL properly — and it is also what lets a link unfurler render the
// opengraph-image those routes exist to serve.
//
// Only paths that are already public are listed. /share/** is public by design
// (the secret token in the URL is the only key) and the root brand assets carry
// no user data. Everything else — every library, watchlist, show and person
// page — stays disallowed and is separately gated by proxy.ts.
//
// No `sitemap` key on purpose: there is no sitemap.xml, and advertising one
// that 404s is a crawl error rather than a harmless no-op. A sitemap would have
// nothing legitimate to list anyway — the only crawlable URLs are the share
// links, and putting a secret token in a public XML file is the one thing this
// file most needs to avoid.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/share/', '/opengraph-image', '/icon', '/apple-icon'],
      disallow: '/',
    },
  }
}
