# Design Spec: DorfMovies Autumn Pine Reskin

## 1. Summary
Migrate the mediatracker application UI from its current violet/orange/rose glassmorphic design to the **Autumn Pine** earthy theme defined in the DorfMovies design system (`.agents/skills/dorfmovies-design/`). This includes replacing hardcoded styling tokens, porting components/primitives, updating visual spacing and radii, and adapting existing pages.

## 2. Goals
* Update the application canvas to use the warm brown-black background (`#100e09` / `--bg-void`) with the `--page-radial` gradient.
* Standardize on the Outfit font family.
* Update navigation, cards, and modal components to use the design system's semantic color, radius, and motion tokens.
* Port primitive layouts (buttons, inputs, status badges) from the design system.

## 3. Architecture & Styling Integration
We will import the design system's CSS variables entry point inside `app/globals.css`:
```css
@import "../.agents/skills/dorfmovies-design/styles.css";
```
This registers custom CSS properties in `:root` which we will map to Tailwind utility class properties.

### 3.1 Custom Radii Mapping
The new spacing scheme uses tighter, editorial corner radii:
* Buttons, Inputs, Chips: `var(--radius-sm)` (4px)
* Nav Items, Rows: `var(--radius-md)` (6px)
* Standard Cards: `var(--radius-lg)` (8px)
* Poster Cards: `var(--radius-xl)` (10px)
* Modals, Popovers: `var(--radius-2xl)` (12px)
* Eyebrows, Badges: `var(--radius-pill)` (9999px)

### 3.2 Custom Shadows & Glows
* Standard Card Shadows: `var(--shadow-md)`
* Poster Shadow: `var(--shadow-poster)`
* Accent Glow: `var(--glow-violet)` (mapped to a soft pine-green outline/shadow on hover)

---

## 4. Component Refactoring Specifications

### 4.1 Root Layout (`app/layout.tsx`)
* Keep the Google `Outfit` font configuration.
* Change body background class to use `bg-[var(--surface-page)]` with the `bg-[var(--page-radial)]` background image.
* Remove the three floating gradient orb elements (`style={{ background: 'rgba(...)' }}`).

### 4.2 Navigation Sidebar (`components/Sidebar.tsx`)
* Desktop aside container background set to `var(--bg-base)`, right border to `1px solid var(--border-subtle)`.
* DorfMovies branding text styled in Outfit bold/extrabold. "Dorf" is white (`var(--white)`), "Movies" is pine green (`var(--brand-mark)`).
* Nav items styled to match the `NavItem` primitive:
  - Active item: background `rgba(255,255,255,0.05)`, border `1px solid var(--border-default)`. Accent highlight in green (`var(--accent)`).
  - Hover item: text brightens to `var(--zinc-300)`, icon scales `scale(1.1)`.
* User profile container: background `rgba(255,255,255,0.01)`, border `1px solid var(--border-faint)`, radius `var(--radius-md)`.
* Update mobile bottom bar and slide-out more drawer with identical tokens (`var(--bg-base)`, `var(--border-subtle)`).

### 4.3 Horizontal Media Card (`components/MediaCard.tsx`)
* Reskin the card wrapper to match `MediaRow.jsx`:
  - Background: `var(--glass-card)` (normal), `var(--glass-card-hover)` (hover).
  - Border: `1px solid var(--border-subtle)` (normal), `1px solid var(--border-strong)` (hover).
  - Radius: `var(--radius-lg)`.
  - Box shadow: none (normal), `var(--glow-violet), var(--inset-hairline)` (hover).
  - Hover motion: `translateY(-2px) scale(1.01)` using `var(--dur-base)` transition.
* Rating element uses `StarRating` rules (see Section 4.5).
* Badges (TV / Movie labels) styled as pill badges with neutral tints (`var(--border-faint)`, background `rgba(255,255,255,0.05)`).
* Delete and edit buttons styled with ghost button states.

### 4.4 Vertical Poster Card (`components/CollectionMovieCard.tsx`)
* Wrapper styled to match `PosterCard.jsx`:
  - Border: `1px solid var(--border-subtle)` (normal), `1px solid var(--border-default)` (hover).
  - Radius: `var(--radius-xl)`.
  - Background: `var(--bg-void)`.
  - Shadow: `var(--shadow-poster)` (normal), `var(--glow-violet), var(--shadow-md)` (hover).
  - Hover motion: `var(--lift-poster)` (`scale(1.02)`) using `var(--dur-slow)`.
* Poster Image: aspect ratio `2 / 3`. Hover scales image (`scale(1.10) rotate(1deg)`) with transition `var(--dur-slower)`.
* Hover overlay: linear gradient overlay with text in white.
* Badges: replace current green/purple indicator icons with semantic pill-badges (Teal badge for watched, Amber badge for watchlisted).

### 4.5 Star Rating Component (`components/RatingStars.tsx`)
* Unfilled star track: `var(--zinc-700)`.
* Filled star/hover state color: `--amber-400` / `--rating`.
* Retain half-star selection mapping and click listeners.

### 4.6 Form Elements & Modals (`components/EditEntryModal.tsx`, `components/MediaInfoModal.tsx`)
* Modal wrapper: background `var(--surface-modal)`, border `1px solid var(--border-subtle)`, radius `var(--radius-2xl)`, shadow `var(--shadow-xl)`.
* Text Inputs / Search Inputs: background `var(--surface-input)`, radius `var(--radius-sm)`, border `1px solid var(--border-default)` (focus `1px solid var(--border-focus)`).
* Primary buttons (e.g. Save, Add): pill/button styled with `--btn-primary-bg` (pine green) and text `--btn-primary-fg` (deep slate-green).
* Ghost buttons (Cancel, Close): background `--btn-ghost-bg`, border `1px solid var(--border-default)`.

---

## 5. Verification Plan
* Validate compilation of CSS variables inside next.js bundle.
* Verify Sidebar layout rendering on desktop and mobile resolutions.
* Verify hover states and scale transformations on MediaCard and CollectionMovieCard.
* Verify star rating inputs and modal popover forms styling.
