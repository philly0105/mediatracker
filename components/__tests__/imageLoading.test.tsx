import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import DashboardRecentCards from '../DashboardRecentCards'
import ContinueWatchingRow, { type ContinueWatchingShow } from '../ContinueWatchingRow'
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
  it('preloads exactly one poster among recent dashboard cards', () => {
    const entries = [
      makeWatchEntry('1', 'Movie 1', 'https://image.tmdb.org/t/p/w500/1.jpg'),
      makeWatchEntry('2', 'Movie 2', 'https://image.tmdb.org/t/p/w500/2.jpg'),
      makeWatchEntry('3', 'Movie 3', 'https://image.tmdb.org/t/p/w500/3.jpg'),
      makeWatchEntry('4', 'Movie 4', 'https://image.tmdb.org/t/p/w500/4.jpg'),
      makeWatchEntry('5', 'Movie 5', 'https://image.tmdb.org/t/p/w500/5.jpg'),
    ]

    const { container } = render(
      <ToastProvider>
        <MultiSelectProvider>
          <DashboardRecentCards entries={entries} />
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

  it('does not preload any Continue Watching posters and sets 64px sizes', () => {
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

    const images = Array.from(container.querySelectorAll('img'))
    expect(images).toHaveLength(3)

    const preloaded = images.filter((img) => img.getAttribute('data-preload') === 'true')
    expect(preloaded).toHaveLength(0)

    for (const img of images) {
      expect(img.getAttribute('data-sizes')).toBe('64px')
    }
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

  it('applies ambient-orb class to ambient layout orbs and configures mobile-only blur/opacity reduction', () => {
    const layoutContent = readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8')
    const globalsContent = readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8')

    const ambientOrbMatches = layoutContent.match(/className="[^"]*ambient-orb[^"]*"/g)
    expect(ambientOrbMatches).not.toBeNull()
    expect(ambientOrbMatches?.length).toBe(3)

    expect(globalsContent).toMatch(/@media\s*\(\s*max-width:\s*640px\s*\)\s*\{[\s\S]*\.ambient-orb[\s\S]*\}/)
  })
})
