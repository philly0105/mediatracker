// The glass tier behind each Card variant. Kept out of Card.tsx, a client
// component, so server components can draw the same tiers: a route's loading
// skeleton that renders a client component makes every prefetch of that route
// download all of the route's JavaScript.

export type CardVariant = 'surface' | 'panel' | 'slab' | 'row' | 'inset'

// Panels tighten from 20px to 14px padding under the 760px content
// breakpoint (spec 4.4), where .glass-panel drops to its 24px radius. The
// padding is a variable so a rail that bleeds to the rim (CastStrip,
// MoreLikeThisRail) can cancel exactly as much as the panel adds.
export const CARD_VARIANT_CLASS: Record<CardVariant, string> = {
  surface: 'card-surface',
  panel: 'glass-panel glass-rim [--panel-pad:14px] min-[760px]:[--panel-pad:var(--space-5)] p-[var(--panel-pad)]',
  slab: 'glass-slab glass-rim p-7',
  row: 'glass-row p-3',
  inset: 'glass-inset p-4',
}

// A panel's shape without its blur: the same padding, radius, tint, shadow and
// rim as `panel`, minus the backdrop-filter. For a skeleton standing in for a
// panel on a page that keeps its placeholders off tier 1 (Home, already near
// the eight-per-viewport budget), so the swap to the real panel moves nothing
// and the placeholder spends no blur. It cannot be `card-surface` plus a
// padding utility: that class is unlayered, so its fixed 20px padding and
// radius beat any utility. Reduced transparency and forced colours get what
// the real panel gets.
export const STILL_PANEL_CLASS =
  'glass-rim [background:var(--glass-panel)] shadow-[var(--shadow-md)] rounded-[24px] min-[760px]:rounded-[var(--radius-2xl)] [@media(prefers-reduced-transparency:reduce)]:[background:var(--glass-fallback)] forced-colors:border forced-colors:border-[CanvasText] [--panel-pad:14px] min-[760px]:[--panel-pad:var(--space-5)] p-[var(--panel-pad)]'
