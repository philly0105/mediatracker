import { ImageResponse } from 'next/og'

// Satori — the renderer behind next/og — resolves no CSS variables and loads no
// stylesheet, so the palette has to be duplicated here as literals. Keep these
// in step with app/styles/design-system/tokens/colors.css.
const C = {
  page: '#061015',
  deep: '#0B1A21',
  text: '#F3F8FA',
  secondary: 'rgba(236, 245, 249, 0.80)',
  muted: 'rgba(236, 245, 249, 0.74)',
  accent: '#8FE3F0',
  ink: '#08161C',
  mark: '#EAF6F9',
  hairline: 'rgba(255, 255, 255, 0.14)',
  ring: 'rgba(255, 255, 255, 0.10)',
}

// The Open Graph standard's 1.91:1 slot. Every consumer (iMessage, Slack,
// Discord, X) crops to roughly this, which is why a bare 2:3 TMDB poster —
// what these routes used to hand out — previewed as a letterboxed sliver.
export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

function clamp(text: string, max: number) {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

export type OgCardProps = {
  eyebrow: string
  title: string
  meta?: string
  description?: string | null
  /** Absolute URL. Satori fetches it while rendering, so a dead link throws. */
  poster?: string | null
}

function OgCard({ eyebrow, title, meta, description, poster }: OgCardProps) {
  // Long titles have to shrink rather than wrap past the card: Satori does no
  // layout-driven font sizing, so the step-down is explicit.
  const titleSize = title.length > 46 ? 52 : title.length > 28 ? 64 : 76

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: C.page,
        // Stands in for the app's blurred backdrop: Satori has no filter or
        // backdrop-filter, so the ambient wash is a plain cool gradient here.
        backgroundImage: 'linear-gradient(160deg, #10303B 0%, #091C24 42%, #061015 100%)',
        padding: 40,
        fontFamily: 'sans-serif',
      }}
    >
      {/* The faint aqua radial the default ambient layer carries in the app. */}
      <div
        style={{
          position: 'absolute',
          top: -200,
          left: -120,
          width: 900,
          height: 620,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(143, 227, 240, 0.20) 0%, rgba(143, 227, 240, 0) 62%)',
        }}
      />

      {/* The glass panel: the tier-1 recipe minus the blur, with a 1px border
          where the app draws the gradient rim. */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          gap: 52,
          padding: '40px 48px',
          borderRadius: 28,
          border: `1px solid ${C.hairline}`,
          backgroundColor: 'rgba(9, 20, 27, 0.52)',
          backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.03) 100%)',
          boxShadow: '0 30px 60px -24px rgba(0, 0, 0, 0.55)',
        }}
      >
        {poster ? (
          // Satori renders a static bitmap: next/image has no runtime here, and
          // alt text has nowhere to go once the tree is a PNG. The card's own
          // `alt` export is what social clients actually read.
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img
            src={poster}
            width={290}
            height={435}
            style={{
              borderRadius: 14,
              objectFit: 'cover',
              border: `1px solid ${C.ring}`,
              background: C.deep,
              boxShadow: '0 18px 32px -14px rgba(0, 0, 0, 0.70)',
            }}
          />
        ) : null}

        {/* Yoga shrinks every row when the column overflows, and text then
            spills out of its shrunken box onto the row below. Only the
            description may give way, so everything else is flexShrink: 0. */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', justifyContent: 'center' }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: C.accent,
              marginBottom: 18,
              flexShrink: 0,
            }}
          >
            {eyebrow}
          </div>

          <div style={{ fontSize: titleSize, fontWeight: 700, color: C.text, lineHeight: 1.1, letterSpacing: -1.5, flexShrink: 0 }}>
            {clamp(title, 70)}
          </div>

          {meta ? (
            <div style={{ fontSize: 28, color: C.secondary, marginTop: 16, flexShrink: 0 }}>{meta}</div>
          ) : null}

          {description ? (
            // Satori's line clamp only applies to display: block text. The
            // overflow: hidden is the backstop for a three-line title, where
            // even three description lines do not fit.
            <div
              style={{
                display: 'block',
                fontSize: 24,
                color: C.muted,
                lineHeight: 1.45,
                marginTop: 22,
                lineClamp: 3,
                flexShrink: 1,
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              {clamp(description, 180)}
            </div>
          ) : null}

          {/* The sidebar wordmark: the rounded-square mark beside the name. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', paddingTop: 24, flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 32 32">
              <rect x="0.5" y="0.5" width="31" height="31" rx="10" fill={C.mark} />
              <path d="M10.5 8h5.7a8 8 0 0 1 0 16h-5.7z" fill={C.ink} />
              <circle cx="16.2" cy="16" r="2.6" fill={C.mark} />
            </svg>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -0.5 }}>DorfMovies</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the card, retrying without the poster if fetching it fails.
 *
 * Satori fetches `poster` inline, so a TMDB hiccup or a stale path would throw
 * and the route would 500 — leaving the link with no preview image at all,
 * which is worse than a preview with no poster.
 */
export async function renderOgCard(props: OgCardProps) {
  try {
    return new ImageResponse(<OgCard {...props} />, { ...OG_SIZE })
  } catch {
    return new ImageResponse(<OgCard {...props} poster={null} />, { ...OG_SIZE })
  }
}
