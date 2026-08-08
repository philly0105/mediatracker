# R3-2 — Global ⌘K search overlay (command palette)

Goal: ⌘K// currently *navigates* to /search, losing your place. Replace that
with an overlay that opens anywhere, searches inline, and can open the full
MediaInfoModal — without leaving the current page.

## Architecture

1. **Extract a shared hook** `lib/useTmdbSearch.ts` from the logic already in
   `components/DashboardSearchBar.tsx`: 350 ms debounce, AbortController with
   abort-on-supersede and AbortError guard, min 2 chars, `results`,
   `loading`, and a `clear()`. Refactor `DashboardSearchBar` to use it (its
   rendering/behaviour must not change). The dedicated `/search` page keeps
   its own logic — do not touch it in this task.
2. **New component** `components/SearchOverlay.tsx` (client).
3. `components/KeyboardShortcuts.tsx` keeps its name and mount point in
   `app/layout.tsx`, but instead of `router.push('/search')` it renders and
   opens `<SearchOverlay />`. Keep the existing guards exactly: ⌘K/Ctrl+K as
   a chord; plain `/` only when not in a typing target; do nothing when
   `isAnyModalOpen()` — EXCEPT the overlay itself counts as "open" via
   `useModal`, so guard against double-open with local state instead of
   removing the check. Update `components/__tests__/KeyboardShortcuts.test.tsx`
   to assert the overlay opens (dialog appears) rather than navigation.

## Visual spec

- Scrim: `fixed inset-0 z-[45]` (above sidebar/nav at z-40, **below**
  MediaInfoModal's portal at z-50 so the full modal can stack on top),
  `background: var(--scrim)`, `backdrop-blur-md`. Click closes.
- Panel: horizontally centered, top at `12vh`, `width: min(640px, calc(100vw - 32px))`,
  `background: var(--surface-modal)`, `border: 1px solid rgba(255,255,255,0.15)`,
  `border-radius: var(--radius-2xl)`, `shadow-2xl`, `overflow-hidden`.
  Entrance animation: framer-motion `initial={{ opacity: 0, scale: 0.98, y: -8 }}`
  `animate={{ opacity: 1, scale: 1, y: 0 }}`, spring stiffness 350 damping 28
  (matches MediaInfoModal).
- Input row: `px-5 py-4 flex items-center gap-3 border-b border-white/5`.
  `Search` icon `w-5 h-5 text-zinc-500`; input is bare — transparent bg, no
  border, `outline-none text-base text-white placeholder:text-zinc-500`,
  placeholder `Search movies and TV shows…`, autofocused on open.
- Results list: `max-h-[min(420px,60vh)] overflow-y-auto p-2`.
  Row: `flex items-center gap-3 p-2 rounded-[var(--radius-md)] cursor-pointer`,
  active/hover state `bg-white/[0.06]`. Contents: poster `next/image` 40×56
  `rounded-[var(--radius-xl)] object-cover` (or the standard "No Poster"
  placeholder box); then title `text-sm font-semibold text-white truncate`;
  under it `text-xs text-zinc-500` → `2019 · Movie`; Watched / Watchlist
  badges exactly as on the /search page rows (`Badge` tone success / neutral,
  via `useLibraryIds`).
- States (centered, `py-8 text-sm text-zinc-600`): under 2 chars →
  `Type to search`; loading → `Searching…`; no results →
  `No matches for “{query}”.`
- Footer: `px-5 py-2.5 border-t border-white/5 flex gap-4 text-[10px]
  font-semibold uppercase tracking-wider text-zinc-600`:
  `↑↓ Navigate` · `↵ Open` · `Esc Close`.

## Interaction

- Escape / scrim click closes (use the existing `useModal` hook for Escape,
  scroll lock, focus restore).
- ↑/↓ move the active row (clamp at ends, no wrap; scroll the active row into
  view with `scrollIntoView({ block: 'nearest' })`). Mouse hover also sets it.
- Enter (or click) opens `MediaInfoModal` for the active result, layered above
  the overlay (it portals to body at z-50). The overlay stays mounted
  underneath; when the modal closes, focus returns to the overlay input.
- Wire the modal's actions with `useMediaActions({ priority: 'want_to_watch' })`
  and update `useLibraryIds` sets on success — same wiring as
  `app/search/page.tsx`.
- Opening the overlay clears nothing; closing it resets query + results.

## Tests

- Extend/replace the KeyboardShortcuts tests: ⌘K opens the overlay, `/` in an
  input does not, Escape closes it.
- The `useTmdbSearch` extraction must keep `app/__tests__/searchDebounce.test.tsx`
  green (it tests DashboardSearchBar).
