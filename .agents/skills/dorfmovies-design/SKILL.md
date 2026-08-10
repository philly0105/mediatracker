---
name: dorfmovies-design
description: Use this skill to generate well-branded interfaces and assets for DorfMovies (a dark, poster-art-driven personal movie/TV tracking app), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files
(`styles.css` + `tokens/` for foundations, `components/` for primitives,
`ui_kits/dorfmovies/` for full screens, `guidelines/` for specimen cards,
`assets/wordmark.html` for the logotype).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out
and create static HTML files for the user to view: link `styles.css`, load Lucide from CDN
(`https://unpkg.com/lucide@latest` + `lucide.createIcons()`), and the design-system bundle
(`_ds_bundle.js`, namespace `window.DorfMoviesDesignSystem_f30e74`). If working on
production code, copy assets and read the rules here to become an expert in designing with
this brand.

Key brand cues ("Autumn Pine"): warm brown-black canvas (`#100e09`) under a fixed film-grain
overlay, with faint pine/rust/amber warmth orbs; **flat opaque** cards (`#1b1711`, hairline
warm border, no backdrop-blur — the blur tokens are deliberately `0`); a warm-stone text ramp
rather than cold grey; pine green `#7c9a6a` as the single accent, with amber for ratings and
rust for destructive; the Outfit typeface (extrabold/black headings, tiny tracked uppercase
eyebrows); tight 4–12px radii, pills reserved for tags and filter chips; poster artwork
carrying the colour; lift-and-hairline hover, never a coloured haze. The wordmark is `Dorf`
(warm cream) + `Movies` (pine green `#7c9a6a`). Lucide icons only; no emoji.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts
_or_ production code, depending on the need.
