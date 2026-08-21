import { ImageResponse } from 'next/og'

// Satori — the renderer behind next/og — resolves no CSS variables and loads no
// stylesheet, so the palette has to be duplicated here as literals. Keep these
// in step with app/styles/design-system/tokens/colors.css.
const C = {
  page: '#100e09',
  raised: '#1b1711',
  text: '#e9e2d3',
  muted: '#9d9079',
  faint: '#918470',
  accent: '#7c9a6a',
  border: 'rgba(236, 231, 218, 0.13)',
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
  const titleSize = title.length > 46 ? 56 : title.length > 28 ? 68 : 82

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: C.page,
        // Stands in for the app's --page-radial, which Satori cannot express as
        // a radial gradient with the same falloff.
        backgroundImage: `linear-gradient(160deg, #2a2114 0%, ${C.page} 55%)`,
        padding: 64,
        alignItems: 'center',
        gap: 56,
        fontFamily: 'sans-serif',
      }}
    >
      {poster ? (
        // Satori renders a static bitmap: next/image has no runtime here, and
        // alt text has nowhere to go once the tree is a PNG. The card's own
        // `alt` export is what social clients actually read.
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
        <img
          src={poster}
          width={324}
          height={486}
          style={{
            borderRadius: 12,
            objectFit: 'cover',
            border: `1px solid ${C.border}`,
            background: C.raised,
          }}
        />
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', justifyContent: 'center' }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: C.accent,
            marginBottom: 20,
          }}
        >
          {eyebrow}
        </div>

        <div style={{ fontSize: titleSize, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>
          {clamp(title, 70)}
        </div>

        {meta ? (
          <div style={{ fontSize: 30, color: C.muted, marginTop: 18 }}>{meta}</div>
        ) : null}

        {description ? (
          <div style={{ fontSize: 26, color: C.faint, lineHeight: 1.45, marginTop: 24 }}>
            {clamp(description, 180)}
          </div>
        ) : null}

        {/* No whitespace between the spans: Satori preserves JSX text nodes, so
            a newline here renders as a gap in the middle of the wordmark. */}
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, marginTop: 'auto' }}>
          <span style={{ color: C.text }}>Dorf</span><span style={{ color: C.accent }}>Movies</span>
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
