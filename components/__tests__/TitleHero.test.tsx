import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { TitleHero } from '../title/TitleHero'

// Exposes the preload flag the way imageLoading.test does, so the policy
// (one preloaded LCP image per page, none in a modal) can be asserted.
vi.mock('next/image', () => ({
  default: ({
    src, alt, fill, sizes, preload, unoptimized, ...props
  }: { src?: string; alt?: string; fill?: boolean; sizes?: string; preload?: boolean; unoptimized?: boolean; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === 'string' ? src : ''}
      alt={alt ?? ''}
      data-fill={fill ? 'true' : undefined}
      data-sizes={sizes}
      data-preload={preload ? 'true' : 'false'}
      data-unoptimized={unoptimized ? 'true' : undefined}
      {...props}
    />
  ),
}))

const BACKDROP = 'https://image.tmdb.org/t/p/w1280/bd.jpg'
const POSTER = 'https://image.tmdb.org/t/p/w500/poster.jpg'
const LOGO = 'https://image.tmdb.org/t/p/w500/logo.png'

describe('TitleHero', () => {
  it('names the page with the title, and keeps the name when a logo stands in for it', () => {
    const { rerender } = render(<TitleHero title="Severance" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Severance')

    rerender(<TitleHero title="Severance" logoUrl={LOGO} />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Severance')
    const logo = heading.querySelector('img')
    expect(logo).toHaveAttribute('src', LOGO)
    // The logo is the title drawn as art; the text beside it is the name.
    expect(logo).toHaveAttribute('alt', '')
  })

  it('renders a second-level heading for the modal', () => {
    render(<TitleHero title="Severance" headingLevel={2} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Severance')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('preloads the backdrop only when asked, and falls back to the poster', () => {
    const { container, rerender } = render(<TitleHero title="Severance" backdropUrl={BACKDROP} preload />)
    let art = container.querySelector('img')
    expect(art).toHaveAttribute('src', BACKDROP)
    expect(art).toHaveAttribute('data-preload', 'true')
    // Decorative: the heading already names the title.
    expect(art).toHaveAttribute('alt', '')

    rerender(<TitleHero title="Severance" posterUrl={POSTER} />)
    art = container.querySelector('img')
    expect(art).toHaveAttribute('src', POSTER)
    expect(art).toHaveAttribute('data-preload', 'false')

    rerender(<TitleHero title="Severance" />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows the tagline and the overview together, and either one alone', () => {
    const { rerender } = render(<TitleHero title="Severance" tagline="Work is work." overview="Mark leads a team." />)
    expect(screen.getByText('Work is work.')).toBeInTheDocument()
    // The old page always showed the overview; a tagline adds to it rather
    // than replacing it.
    expect(screen.getByText('Mark leads a team.')).toBeInTheDocument()

    rerender(<TitleHero title="Severance" overview="Mark leads a team." />)
    expect(screen.getByText('Mark leads a team.')).toBeInTheDocument()
    expect(screen.queryByText('Work is work.')).not.toBeInTheDocument()
  })

  it('lays the meta line out as the certification chip, then one run of year, genres and score', () => {
    render(
      <TitleHero
        title="Severance"
        certification="TV-MA"
        year={2022}
        genres={['Drama', 'Mystery', 'Sci-Fi', 'Thriller']}
        tmdbScore={8.4}
      />
    )
    expect(screen.getByText('TV-MA')).toBeInTheDocument()
    // One run, capped at three genres, so it wraps as prose. The dots are
    // bound to the word before them with a no-break space, which getByText
    // folds into an ordinary one.
    const run = screen.getByText('2022 · Drama · Mystery · Sci-Fi · TMDB 84%')
    expect(run.textContent).toBe('2022\u00a0· Drama\u00a0· Mystery\u00a0· Sci-Fi\u00a0· TMDB\u00a084%')
    expect(screen.queryByText(/Thriller/)).not.toBeInTheDocument()
  })

  it('leaves the score out when there is none', () => {
    render(<TitleHero title="Severance" year={2022} tmdbScore={0} />)
    expect(screen.queryByText(/TMDB/)).not.toBeInTheDocument()
  })

  it('shows a movie runtime in the meta line, and never a show one', () => {
    const { rerender } = render(<TitleHero title="Heat" type="movie" runtimeMins={170} />)
    expect(screen.getByText('2h 50m')).toBeInTheDocument()
    expect(screen.getByText('Movie')).toBeInTheDocument()

    rerender(<TitleHero title="Severance" type="show" runtimeMins={53} />)
    expect(screen.queryByText('53m')).not.toBeInTheDocument()
    expect(screen.getByText('TV Show')).toBeInTheDocument()
  })

  it('shows the platform chip, the status and the actions', () => {
    render(
      <TitleHero
        title="Severance"
        platform={{ name: 'Apple TV+' }}
        status={<p>status slot</p>}
        actions={<button type="button">Mark E7 watched</button>}
      />
    )
    expect(screen.getByText('Apple TV+')).toBeInTheDocument()
    expect(screen.getByText('status slot')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark E7 watched' })).toBeInTheDocument()
  })
})
