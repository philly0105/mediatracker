import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import DashboardRecentCards from '../DashboardRecentCards'
import ContinueWatchingRow, { type ContinueWatchingShow } from '../ContinueWatchingRow'
import EmptyHero from '../home/EmptyHero'
import { MultiSelectProvider } from '../MultiSelectProvider'
import { ToastProvider } from '../ToastProvider'
import type { WatchEntry, Media } from '@/types'

// Mock next/navigation for DashboardRecentCards router usage
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), back: vi.fn() }),
}))

// Mock MediaModalProvider for DashboardRecentCards
vi.mock('@/components/MediaModalProvider', () => ({
  useMediaModal: () => ({ openMedia: vi.fn(), closeMedia: vi.fn() }),
}))

// Mock next/image to expose data-preload and data-sizes for policy testing
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill,
    sizes,
    priority,
    preload,
    ...props
  }: {
    src?: string
    alt?: string
    fill?: boolean
    sizes?: string
    priority?: boolean
    preload?: boolean
    [key: string]: unknown
  }) => {
    const isPreloaded = Boolean(preload ?? priority)
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={typeof src === 'string' ? src : ''}
        alt={alt ?? ''}
        data-fill={fill ? 'true' : undefined}
        data-sizes={sizes}
        data-preload={isPreloaded ? 'true' : 'false'}
        {...props}
      />
    )
  },
}))

const ROOT = path.resolve(__dirname, '../..')
const DIRS = ['app', 'components', 'lib']
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx'])
const DEPRECATED_IMAGE_PRIORITY = /<Image[\s\S]{0,500}\bpriority=/

function findSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      return name === 'node_modules' || name === '__tests__' ? [] : findSourceFiles(full)
    }
    if (name.includes('.test.') || name.includes('.spec.')) {
      return []
    }
    return EXT.has(path.extname(name)) ? [full] : []
  })
}

function makeWatchEntry(id: string, title: string, posterUrl: string): WatchEntry {
  const media: Media = {
    id: `m-${id}`,
    tmdb_id: Number(id),
    type: 'movie',
    title,
    overview: 'overview',
    poster_url: posterUrl,
    release_year: 2024,
    runtime_mins: 120,
    genres: ['Action'],
    vote_average: 8.0,
    cast_members: [],
    director: null,
    collection_id: null,
    collection_name: null,
  }
  return {
    id: `we-${id}`,
    user_id: 'u1',
    media_id: media.id,
    media,
    rating: 8,
    review: null,
    rewatch: false,
    watched_at: '2026-08-20T00:00:00Z',
    created_at: '2026-08-20T00:00:00Z',
  }
}

function makeShow(id: string, title: string, posterUrl: string): ContinueWatchingShow {
  return {
    media: { id, title, poster_url: posterUrl },
    seasons: [{ id: `s-${id}`, season_number: 1, episode_count: 5 }],
    watchedEpisodeKeys: [`s-${id}-1`],
    nextUp: { season_id: `s-${id}`, season_number: 1, episode_number: 2 },
  }
}

describe('image loading policy (Next.js 16)', () => {
  it('preloads the first recent poster only when the page asks it to', () => {
    const entries = [
      makeWatchEntry('1', 'Movie 1', 'https://image.tmdb.org/t/p/w500/1.jpg'),
      makeWatchEntry('2', 'Movie 2', 'https://image.tmdb.org/t/p/w500/2.jpg'),
      makeWatchEntry('3', 'Movie 3', 'https://image.tmdb.org/t/p/w500/3.jpg'),
      makeWatchEntry('4', 'Movie 4', 'https://image.tmdb.org/t/p/w500/4.jpg'),
      makeWatchEntry('5', 'Movie 5', 'https://image.tmdb.org/t/p/w500/5.jpg'),
    ]

    // Default: the hero backdrop above the rail is the LCP image, so the rail
    // preloads nothing.
    const quiet = render(
      <ToastProvider>
        <MultiSelectProvider>
          <DashboardRecentCards entries={entries} />
        </MultiSelectProvider>
      </ToastProvider>
    )
    const quietImages = Array.from(quiet.container.querySelectorAll('img'))
    expect(quietImages).toHaveLength(5)
    expect(quietImages.filter((img) => img.getAttribute('data-preload') === 'true')).toHaveLength(0)
    quiet.unmount()

    // No hero art on the page: the first poster takes the one preload slot.
    const { container } = render(
      <ToastProvider>
        <MultiSelectProvider>
          <DashboardRecentCards entries={entries} preloadFirst />
        </MultiSelectProvider>
      </ToastProvider>
    )

    const images = Array.from(container.querySelectorAll('img'))
    expect(images).toHaveLength(5)

    const preloaded = images.filter((img) => img.getAttribute('data-preload') === 'true')
    expect(preloaded).toHaveLength(1)
    expect(images[0].getAttribute('data-preload')).toBe('true')
    expect(images[1].getAttribute('data-preload')).toBe('false')
    expect(images[2].getAttribute('data-preload')).toBe('false')
    expect(images[3].getAttribute('data-preload')).toBe('false')
    expect(images[4].getAttribute('data-preload')).toBe('false')

    for (const img of images) {
      expect(img.getAttribute('data-sizes')).toBe('(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw')
    }
  })

  it('does not preload any Up next posters and leaves them at their fixed 60x90', () => {
    const shows = [
      makeShow('s1', 'Show 1', 'https://image.tmdb.org/t/p/w500/s1.jpg'),
      makeShow('s2', 'Show 2', 'https://image.tmdb.org/t/p/w500/s2.jpg'),
      makeShow('s3', 'Show 3', 'https://image.tmdb.org/t/p/w500/s3.jpg'),
    ]

    const { container } = render(
      <ToastProvider>
        <ContinueWatchingRow shows={shows} />
      </ToastProvider>
    )

    // The first show is the hero, which has no backdrop here, so only the two
    // Up next rows carry an image.
    const images = Array.from(container.querySelectorAll('img'))
    expect(images).toHaveLength(2)

    const preloaded = images.filter((img) => img.getAttribute('data-preload') === 'true')
    expect(preloaded).toHaveLength(0)

    for (const img of images) {
      expect(img.getAttribute('data-sizes')).toBeNull()
      expect(img.getAttribute('width')).toBe('60')
      expect(img.getAttribute('height')).toBe('90')
    }
  })

  it('preloads the hero backdrop, and nothing else, when the first show has art', () => {
    const shows = [
      { ...makeShow('s1', 'Show 1', 'https://image.tmdb.org/t/p/w500/s1.jpg'), art: { backdrop_url: 'https://image.tmdb.org/t/p/w1280/s1-backdrop.jpg', logo_url: null } },
      makeShow('s2', 'Show 2', 'https://image.tmdb.org/t/p/w500/s2.jpg'),
    ]

    const { container } = render(
      <ToastProvider>
        <ContinueWatchingRow shows={shows} />
      </ToastProvider>
    )

    const images = Array.from(container.querySelectorAll('img'))
    const preloaded = images.filter((img) => img.getAttribute('data-preload') === 'true')
    expect(preloaded).toHaveLength(1)
    expect(preloaded[0].getAttribute('src')).toContain('s1-backdrop')
    expect(preloaded[0].getAttribute('data-fill')).toBe('true')
    expect(preloaded[0].getAttribute('alt')).toBe('')
    // The art is the stage's width up to lg, where it becomes the whole stage.
    expect(preloaded[0].getAttribute('data-sizes')).toBe('(max-width: 1023px) 100vw, 1200px')
  })

  it('keeps the hero logo decorative, with the title text beside it for forced colours', () => {
    const shows = [
      { ...makeShow('s1', 'Show 1', 'https://image.tmdb.org/t/p/w500/s1.jpg'), art: { backdrop_url: null, logo_url: 'https://image.tmdb.org/t/p/w500/s1-logo.png' } },
    ]

    const { container } = render(
      <ToastProvider>
        <ContinueWatchingRow shows={shows} />
      </ToastProvider>
    )

    const heading = container.querySelector('#hero-title') as HTMLElement
    expect(heading).toHaveTextContent('Show 1')
    const logo = heading.querySelector('img')
    expect(logo?.getAttribute('src')).toContain('s1-logo')
    expect(logo?.getAttribute('alt')).toBe('')
    expect(logo?.getAttribute('data-preload')).toBe('false')
    // A white logo can vanish on the Canvas slab under forced colours, so it
    // hides there and the screen-reader-only title takes its place.
    expect(logo?.className).toContain('forced-colors:hidden')
    expect(heading.querySelector('span')?.className).toBe('sr-only forced-colors:not-sr-only')
  })

  it('preloads the empty hero art only when the page asks it to', () => {
    const recent = { title: 'Sinners', backdrop_url: 'https://image.tmdb.org/t/p/w1280/sinners-backdrop.jpg' }

    // A late TMDB fallback: the rail already holds the page's one preload.
    const quiet = render(<EmptyHero recent={recent} />)
    expect(quiet.container.querySelector('img')?.getAttribute('data-preload')).toBe('false')
    quiet.unmount()

    // Stored art: the hero is the LCP image, and the rail preloads nothing.
    const { container } = render(<EmptyHero recent={recent} preload />)
    const art = container.querySelector('img')
    expect(art?.getAttribute('data-preload')).toBe('true')
    expect(art?.getAttribute('data-fill')).toBe('true')
    expect(art?.getAttribute('alt')).toBe('')
  })

  it('rejects deprecated Image priority prop across all non-test source files', () => {
    const sourceFiles = DIRS.flatMap((d) => findSourceFiles(path.join(ROOT, d)))
    const offenders = sourceFiles
      .filter((file) => DEPRECATED_IMAGE_PRIORITY.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file))

    expect(offenders).toEqual([])
  })

  it('matches Popular Collections image hints to its 2/3/4-column grid', () => {
    const source = readFileSync(path.join(ROOT, 'components/PopularCollectionsFeed.tsx'), 'utf8')
    const expectedSizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'

    expect(source.split(`sizes="${expectedSizes}"`)).toHaveLength(3)
  })

  it('paints the ambient backdrop as one host layer with no fixed body background', () => {
    const layoutContent = readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8')
    const globalsContent = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')

    // One fixed host, mounted once, rather than a layer per page. A blur
    // utility in the layout and a fixed-attachment body background are both
    // per-scroll-frame paint costs.
    expect(layoutContent.match(/<AmbientHost \/>/g)).toHaveLength(1)
    expect(layoutContent).not.toMatch(/blur-\[\d+px\]/)
    expect(globalsContent).not.toContain('background-attachment: fixed')

    // Reduced transparency drops the blurred art and keeps the tint.
    expect(globalsContent).toMatch(/@media\s*\(\s*prefers-reduced-transparency:\s*reduce\s*\)\s*\{[\s\S]*?\.ambient-img\s*\{\s*display:\s*none/)
  })
})
