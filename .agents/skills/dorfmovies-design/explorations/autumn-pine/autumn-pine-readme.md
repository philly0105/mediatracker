# DorfMovies — Design System

A design system for **DorfMovies**, a personal movie & TV tracking app. You log what
you've watched, rate and review it, keep a prioritized watchlist, track episode
progress, browse stats, and pit titles against each other in "Versus." The product is
**dark-first and poster-art-driven**, styled in an **"Autumn Pine" earthy** direction: a
warm brown-black canvas with a **film-grain** wash, flat solid cards with crisp hairline
borders, soft low contrast, a **deep pine-green** hero with a small playful accent set
(amber, rust, dusty-teal), and **all-sans** type (Outfit).

> Note: the product is referred to as "MediaTracker" in the project brief, but the
> shipping brand name in the codebase is **DorfMovies** (see `layout.tsx` metadata and
> the sidebar wordmark). This system uses **DorfMovies** throughout.

---

## Sources

This system was reverse-engineered from the real product. If you have access, explore
these to go deeper:

- **GitHub repo:** https://github.com/philly0105/mediatracker — Next.js 16 + Supabase +
  TMDB. Key reads: `app/globals.css`, `app/layout.tsx`, `app/page.tsx` (dashboard),
  `components/Sidebar.tsx`, `components/MediaCard.tsx`, `components/ui/SpotlightCard.tsx`,
  `components/ui/BentoGrid.tsx`, `components/RatingStars.tsx`,
  `components/MediaInfoModal.tsx`, `components/EditEntryModal.tsx`.
- **Local codebase:** `app/` (the Next.js App Router tree — pages for dashboard, search,
  movies, shows, watchlist, collections, stats, calendar, versus, settings, login).

The repo `README.md` is unmodified create-next-app boilerplate (mentions Geist, but the
app actually loads **Outfit** via `next/font/google`).

### Tech context
- **Framework:** Next.js 16 (App Router, server components) + Supabase auth/DB + TMDB API.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`) with a small set of hand-written
  utility classes in `globals.css` (`.glass-card`, `.glass-panel`, `.bg-grid`).
- **Motion:** framer-motion (spring hovers, layout animations, fade-up entrances).
- **Icons:** lucide-react.
- **Charts:** recharts (stats page).

---

## CONTENT FUNDAMENTALS

**Voice — plain, second-person, encouraging.** Copy speaks to *you* about *your*
collection: "Your personal media collection and viewing analytics." / "Track your movies,
TV shows, and watchlists." It is functional and warm, never clever or jargon-heavy. No
exclamation-mark hype except a single friendly nudge ("Ready for a new show?").

**Casing:**
- **Sentence case** for body copy, descriptions, empty states ("Nothing watched yet.",
  "No movies logged yet.").
- **Title Case** for nav items, page titles, and primary buttons ("Dashboard", "Sign In",
  "Save Changes", "Must Watch").
- **ALL-CAPS, tracked** for micro eyebrow labels and badges only ("WELCOME BACK", "LIVE
  NOW", "PRIORITY", "YEAR 2026", "WATCHED", "WATCHLIST"). These are tiny (10–11px), bold,
  with wide letter-spacing.

**Person:** Second person ("you / your") in marketing-ish surfaces; otherwise the UI is
label-driven and impersonal ("Date watched", "Review (optional)", "12 watched").

**Tone examples (verbatim from product):**
- Eyebrow + hero: `WELCOME BACK` → "Dashboard" → "Your personal media collection and
  viewing analytics."
- Status pill: `● LIVE NOW`, label "Continuing", title, "Updated today".
- Empty state: "Nothing watched yet." + a "Start searching →" button.
- Counts as quiet meta: "{n} watched", "{year} · TV Show".
- Buttons are short verbs/verb-phrases: "Sign In", "Save Changes", "Cancel",
  "Add to Watchlist", "Mark as Watched", "View all".

**Numbers are heroes.** Big stats (watched-this-year, must-watch count, hours) are
rendered enormous (60px, black weight, often gradient-filled). Counts elsewhere are quiet
zinc-500 meta.

**Emoji:** none in the UI chrome. The only non-icon glyph used as UI is the **★ star**
(U+2605) in the rating control. No emoji in labels, buttons, or copy.

---

## VISUAL FOUNDATIONS

**Overall vibe:** earthy, muted, film-warm. A warm brown-black canvas with a fine grain
wash and solid cards edged in faint hairlines; soft and low-contrast so nothing shouts.
Pine green leads, with amber / rust / dusty-teal as a small playful supporting cast, and
poster artwork providing the saturated color. Think a vintage repertory-cinema program
on aged paper, rendered dark.

**Color:**
- Canvas is a flat, **warm brown-black**, never pure black: `#100e09` (void) → `#15120c`
  (shell/sidebar) → `#1b1711` (cards) → `#201b13` (modals). A subtle radial gradient warms
  the top of the page (`radial-gradient(circle at 50% -10%, #2a2114, #100e09 55%)`), and a
  **film-grain** layer (`--grain`, fractal-noise SVG, ~13% opacity, `mix-blend: overlay`)
  sits fixed over everything.
- **Pine green `#7c9a6a` is the hero** — buttons, active nav, eyebrows, focus rings, the
  primary stat. Around it sits a **small playful set**: **amber `#d3a85c`** (the "this
  year" / rating warmth), **rust `#c4805f`** (reserved for **"live / now-watching"**), and
  **dusty-teal `#6f9089`** ("watched" success). Four hues total, all muted — soft, not loud.
- Text is a **warm stone** ramp: `#e9e2d3` primary → `#9d9079` secondary → `#7a6f5b`
  muted → `#564e3f` faint. Low contrast against the brown base is intentional.
- Accents appear as **low-alpha tints** for fills (`bg/14`) with stronger borders
  (`border/30`); pine green is the one hue that also shows as a solid block (primary button).

**Backgrounds:** mostly flat, plus grain. (1) the gentle warm page radial; (2) the
fixed **film-grain** overlay; (3) three large **ambient warmth orbs** behind content (pine
top-left, rust bottom-right, amber center — very low opacity, 120–150px blur) peeking
through gaps; (4) on "now watching," the show's **poster at ~10% opacity with
`mix-blend-luminosity`** bleeding through the card. No hand-drawn illustrations or
skeuomorphic textures — grain is the only texture.

**Surfaces are flat and solid — no glassmorphism.** Cards/panels/modals are opaque warm
fills with a crisp hairline border and a deep, low-spread shadow. Backdrop-blur tokens are
set to `0`.
- `glass-card` (legacy name, now solid): `#16130f`, hover `#1e1a13`, `1px` warm hairline.
- `glass-panel`: `#14110d`. modal: `#1a1610` over a `rgba(8,6,4,.82)` scrim.
- `SpotlightCard`: solid `#16130f` with a faint **gold mouse-following spotlight** on hover.

**Borders:** warm cream at low alpha — `.04 / .07 / .10 / .13` resting; the *strong* and
*focus* borders are **pine green** (`green/.42`, `green/.65`), so emphasis reads as a thin
green edge rather than a glow.

**Corner radii are tight and editorial.** `4px` buttons/inputs/chips, `6px` nav/rows,
`8px` cards, `10px` poster cards, `12px` modals/spotlight cards. Pills (`9999px`) are now
reserved for **badges and eyebrows only** — buttons are squared-off.

**Shadows & rings:** resting shadows are deep, neutral, low-spread
(`0 28px 64px -24px rgba(0,0,0,.85)`). On hover, cards add a slightly stronger shadow plus a
**thin pine-green ring** (`0 0 0 1px green/.30`; rust for live) — no soft colored haze. The
"live" dot keeps a small rust ring + glow.

**Hover states:** cards **lift only** (`translateY(-3px)`, no scale); posters scale `1.02`
with a slight rotate; the border goes pine green and the icon chip scales to 110%. Title
links shift toward green (poster titles) or stay white→rust (the "now watching" card). Ghost
buttons lighten their fill; the green primary button brightens to `#97b27e`. Arrow icons
translate right on hover.

**Press / active:** subtle — settles back to rest, no hard color flash.

**Typography is all-sans (Outfit).** Headings run heavy — extrabold/black, tight
`-0.02/-0.04em` tracking; big stat numerals are extrabold. Body/nav/meta are medium. Tiny
uppercase eyebrows keep wide `0.12em` tracking. No serif — the feel is clean and modern,
with warmth carried by color and grain rather than type.

**Motion:** entrances **fade up** (`opacity 0→1, y 20→0`) on the house easing
`cubic-bezier(0.22, 1, 0.36, 1)`; transitions `0.18–0.6s`. The brick status dot pulses.
Reduced-motion should drop transforms.

**Imagery vibe:** real TMDB **poster art** — full-color, portrait `2:3`, carrying the
color in an otherwise warm-neutral UI. When used as background it's desaturated (low
opacity, luminosity blend). Aspect is strictly `2:3`; rows pair a 16×24 poster thumb with text.

**Layout rules:** fixed 256px left sidebar (desktop). Content max-widths: `1280px` bento
dashboard, `672px` search/forms. Generous section rhythm (48px). Bento grids mix 1–2 column
spans. 28px interior padding on big cards.

---

## ICONOGRAPHY

**System:** [**lucide-react**](https://lucide.dev) exclusively — clean 1.5–2px stroke,
rounded line-caps, no fills (except a few deliberately filled play/star glyphs). Icons are
small (`w-3.5`–`w-5`, i.e. 14–20px) and tinted to match context: zinc-500 resting, the
accent on active/hover. Icon "chips" are a `40px` round tint well (`bg/10 + border/20`) with
the icon centered, scaling to 110% on hover.

For HTML artifacts, load Lucide from CDN:
```html
<script src="https://unpkg.com/lucide@latest"></script>
<!-- use <i data-lucide="film"></i> then lucide.createIcons() -->
```
The brand glyph vocabulary (from the sidebar/nav): `home, search, calendar, film, tv,
list-todo, library, sparkles, swords, layers, bar-chart-3, upload, settings, user,
play, flame, clock, star, trending-up, monitor-play, plus, check, bookmark, x, pencil,
trash-2, loader-2, more-horizontal, arrow-right`.

- **★ star (U+2605)** is the one Unicode glyph used as UI — it powers the rating control
  (gray track ★ with an amber overlay ★ clipped by width for half-stars).
- **Avatars:** generated from DiceBear `notionists` (`api.dicebear.com/7.x/notionists/svg`)
  seeded on the user's email — a placeholder, not a brand asset.
- **No emoji.** No icon font / sprite. No custom SVG illustration set.

**Logo / wordmark:** there is no image logo. The brand is a **text wordmark** — `Dorf`
in warm cream + `Movies` in pine green (`#7c9a6a`), Outfit extrabold, tight tracking:
`Dorf` + `<span style="color:#7c9a6a">Movies</span>`. See `assets/wordmark.html`.

---

## VISUAL INDEX (root manifest)

- `styles.css` — global entry; `@import`s every token + font file. **Consumers link this.**
- `tokens/`
  - `fonts.css` — Outfit `@font-face`/import (Google Fonts).
  - `colors.css` — canvas, zinc ramp, accents, glass surfaces, borders, semantic aliases.
  - `typography.css` — Outfit scale, weights, tracking, type roles.
  - `spacing.css` — 4px grid, layout widths, poster ratio.
  - `effects.css` — radii, blur, shadows/glows, motion easings.
  - `textures.css` — the film-grain token (`--grain`, `--grain-opacity`).
- `assets/` — `wordmark.html` (the DorfMovies logotype) + icon usage notes.
- `components/` — reusable primitives (see below).
- `ui_kits/dorfmovies/` — full-screen click-through recreation of the app.
- `guidelines/` — foundation specimen cards (Type / Colors / Spacing / Brand).
- `SKILL.md` — Agent-Skill manifest.

### Components
`core/` — `Button`, `Badge`, `IconChip`, `Eyebrow`, `Input`, `GlassCard`, `SpotlightCard`,
`StarRating`, `StatTile`, `PosterCard`, `MediaRow`, `NavItem`.

### UI Kit
`ui_kits/dorfmovies/` — `Dashboard`, `Search`, `Library`, `Detail` screens composed from
the primitives, with an interactive `index.html`.
