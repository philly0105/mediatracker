---
name: dorfmovies-design
description: DorfMovies design system ("Spatial Glass"). Use when building or restyling DorfMovies UI, choosing its tokens, glass tiers or components, or making HTML mocks, prototypes or assets on-brand.
user-invocable: true
---

DorfMovies is a dark, artwork-led movie and TV tracker. Its look is Spatial Glass:
translucent glass panels over the featured title's backdrop blurred 80px, a cool
blue-black canvas (`#061015`), one aqua accent (`#8FE3F0`) for progress, "next", current
state and focus, gold (`#F2C46D`) for star ratings only, and Inter at weights 500, 600
and 650. Containers are radius 28, rows and controls 14, buttons pills. Numbers are
tabular.

1. Read `readme.md` in this skill. It has the principles, the glass tiers and their
   performance budget, the ambient backdrop, every token with its value, the component
   index, voice, icons and the brand mark. Done when you know which tier each surface in
   your task is and which tokens it reads.
2. For production code, build from the real components in `components/ui/` (plus
   `components/RatingStars.tsx` and `components/AmbientBackdrop.tsx`). Before using one,
   read its recipe in `components/<group>/*.prompt.md`. Colours, radii, shadows and type
   come from tokens through `var(--…)`; the glass classes live in `app/globals.css`.
3. For HTML (mocks, prototypes, slides), link `styles.css` then `glass.css` from this
   skill, use the `.glass-*` classes and the `.ambient` markup described in `glass.css`,
   and draw icons as inline Lucide SVGs at stroke width 1.8. `guidelines/*.html` and
   `assets/wordmark.html` are working examples.
4. Check the result against `docs/designs/spatial-glass/reference/home.html`, the
   approved mock, which wins any disagreement with this skill. The spec is
   `docs/superpowers/specs/2026-10-22-spatial-glass-redesign.md`; section 5.5 has the
   component recipes. Done when the screen matches the reference's tiers, type, spacing
   and colour, and nothing references a retired token (`readme.md`, "Retired").

`explorations/autumn-pine/` is the archived previous look. Leave it out of new work.

If the user invokes this skill with no other request, ask what they want to build, then
work as the designer and produce HTML or production code to suit.
