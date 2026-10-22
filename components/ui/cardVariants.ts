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
