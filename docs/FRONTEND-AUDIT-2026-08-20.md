# DorfMovies frontend audit — 2026-08-20

Audited at commit `cc50c08`, Next.js 16.2.6, branch `master`. Browser evidence
came from a signed-in production session at `https://dorfmovies.vercel.app`
plus local public routes. Read-only: the audit submitted no mutation against
the account.

Revised 2026-08-26 — findings reprioritised and six of them patched. The
original long-form report is superseded; every claim below was re-verified
against source before rewriting.

## Do this

Six defects were one-line-to-one-block fixes and are patched in the working
tree (see Fixed, below). Three remain open and need actual thought:

1. **DFA-005** — `app/(app)/layout.tsx:18` swallows every auth exception into
   `user = null`, so a Supabase outage renders as an ordinary signed-out shell.
2. **DFA-003** — `/reset-password` shows the password form while the recovery
   session is still being validated, then swaps to "Link expired."
3. **DFA-002** — half-star rating targets are 16×32 CSS px (WCAG 2.2 SC 2.5.8
   wants 24×24) and the widget spends ten tab stops on one logical field.

Nothing else here blocks a release. There were no P0 or P1 findings.

## Status

| ID | What | State |
| --- | --- | --- |
| DFA-001 | Selection overlay invisible when keyboard-focused | Patched |
| DFA-004 | `metadataBase` fell back to a dead deployment origin | Patched |
| DFA-012 | `sr-only` on `<table>` overflowed the document on `/stats` | Patched |
| DFA-013 | `minmax(320px, 1fr)` overflowed below 375px | Patched |
| DFA-015 | CSV file picker was pointer-only | Patched |
| DFA-016 | Share URL field had no accessible name | Patched |
| DFA-005 | Auth failures collapse into an unauthenticated shell | Open |
| DFA-003 | Password form renders before session validation | Open |
| DFA-002 | Half-star targets below the WCAG 2.2 minimum | Open |
| DFA-014 | Global search does not return focus to its opener | Open |
| DFA-006 | `shadow-green-*` glow on selected/filter/modal states | Cosmetic |
| DFA-007 | Pill-shaped dashboard search; Unicode import status glyphs | Cosmetic |
| DFA-008 | README is still the create-next-app default | Cosmetic |
| DFA-010 | `/library` materialises the full history client-side | Unmeasured |
| DFA-009 | No browser-level tests for focus/geometry/auth transitions | Not a defect |
| DFA-011 | Three route files run 360–698 lines | Not a defect |

DFA-009 and DFA-011 are requests for more work, not defects — they are listed
so they stop being counted as findings. DFA-010 is a hypothesis; measure a
large account before changing anything.

## Open findings

### DFA-005 — auth service failures render as a signed-out shell

`app/(app)/layout.tsx:12-20` wraps `getAuthenticatedUser()` in a bare `catch`
and continues with `user = null`, then renders children anyway. An outage, a
misconfiguration and a genuine logout are indistinguishable: the shell drops
its navigation but still renders protected content, leaving each route to
decide for itself what to do. Confirmed in source; the downstream signed-in
behaviour was not reproducible without breaking the live session.

Separate the expected no-session result from the exception. Route the
exception to a deliberate error or retry state rather than into the anonymous
path. Tests should cover valid user, null user, rejected lookup, and expired
cookies.

### DFA-003 — password form renders before the recovery session is known

`app/(public)/reset-password/page.tsx:19-24,39-50,67-86`. While the async
`auth.getUser()` is pending, `hasSession` is `null`, which falls through to
the real form with both password fields visible and only the submit button
disabled. When the check resolves false the UI swaps to "Link expired."
Observed at 320×568 in the in-app Chromium.

Add a branch for `hasSession === null` that renders a neutral validating
state, and treat a rejected `getUser()` as a distinct recoverable error rather
than an unhandled rejection.

### DFA-002 — half-star rating targets and tab stops

`components/RatingStars.tsx:63-84`. Each star box is 32×32 and each half is
`w-1/2 h-full`, giving ten adjacent 16×32 targets with no separating space.
Measured at exactly 16×32 in the production media modal at 1280×800. The
buttons do carry `focus-visible` rings, so this is target size and keyboard
efficiency, not focus visibility.

The fix is to model the control as one radiogroup or slider with arrow-key
operation and a single tab stop, keeping half-steps and the clear action. That
is a redesign, not a CSS tweak — hence it stayed open.

### DFA-014 — global search does not return focus to its opener

Opening the sidebar search with Enter focuses the combobox; Escape closes it
and leaves `document.activeElement` on `BODY`. Confirmed live at 1280×800. The
internal focus trap works, and the shared `useModal` restoration
(`lib/useModal.ts:41-45,94-109`) works correctly for the media modal — so the
bug is specific to the dynamically mounted search panel's opener lifecycle in
`components/KeyboardShortcuts.tsx:89-97,130-138`. Capture the focused opener
before dispatch and restore it after exit.

## Fixed

Patched in the working tree on 2026-08-26. Each is confirmed in source; none
has been re-verified in a browser.

- **DFA-001** — `components/SelectableOverlay.tsx`: the button's default state
  was `opacity-0 scale-95` revealed only by `group-hover`, so keyboard users
  focused an invisible control (WCAG 2.2 SC 2.4.7). Confirmed live: computed
  opacity `0` on the active element at 1280×800. Added
  `focus-visible:opacity-100 focus-visible:scale-100` plus a focus ring.
- **DFA-004** — `app/layout.tsx:10`: `metadataBase` fell back to
  `https://mediatracker-ebon.vercel.app`, which returns Vercel
  `DEPLOYMENT_NOT_FOUND`. Live production was emitting `og:image` against that
  dead origin, proving the deployment override was absent. Fallback repointed
  at `https://dorfmovies.vercel.app` and `NEXT_PUBLIC_SITE_URL` documented in
  `.env.local.example`. **Still set the variable in the Vercel project** — the
  fallback is a safety net, not the fix.
- **DFA-012** — `components/StatsCharts.tsx`: `sr-only` on a `<table>` leaves
  the table's intrinsic width and `white-space: nowrap` intact, so the
  absolutely positioned tables stretched the document. Measured live: a 390px
  viewport gave a 657px document, with the three tables 564/613/502px wide;
  also reproduced at 1024, 1280 and 1440. The class now clips a wrapping
  `<div>`.
- **DFA-013** — `components/LibraryView.tsx` and `app/(app)/watchlist/page.tsx`:
  `repeat(auto-fill, minmax(320px, 1fr))` cannot fit inside the post-gutter
  content area on a 320px viewport. Measured 336px documents against a 291px
  inner width; overflowed at 320/340/360, cleared at 375. Changed to
  `minmax(min(100%, 320px), 1fr)` at all four sites.
- **DFA-015** — `components/ImportExportPanel.tsx`: the CSV picker was a click
  handler on a `<div>` wrapping a `display: none` input, so it had no role, no
  tab stop, and no keyboard activation (WCAG 2.1.1, 4.1.2). Now a `<label>`
  around an `sr-only` — therefore still focusable — input, with a
  `focus-within` ring and no `onClick` (the label activates the input by
  itself; both would open two pickers). Drag and drop unchanged.
- **DFA-016** — `components/ShareToggle.tsx`: the read-only share URL was an
  unnamed textbox in the accessibility tree. Both it and the adjacent Copy
  button now carry share-type-specific `aria-label`s.

`components/ShowDetailClient.tsx` was **not** changed. Its hero also overflowed
at 320px (328px document) by keeping a 128px poster, gap, metadata and a 160px
rating row on one flex line. Stacking it interacts with the DFA-002 rating
redesign, so both should land together.

## Deferred

- **DFA-006** — `shadow-green-*` on `SelectableOverlay.tsx:44`,
  `FilterPills.tsx:25`, `streaming/page.tsx:211,243`,
  `MediaInfoModal.tsx:393`. The design system specifies neutral lift and warm
  hairlines; these reintroduce a colored haze. Cosmetic drift.
- **DFA-007** — `DashboardSearchBar.tsx:11` uses a `rounded-full` field where
  the system reserves pills for compact tags; `ImportExportPanel.tsx:309` uses
  Unicode status glyphs instead of Lucide icons, which renders inconsistently
  per platform.
- **DFA-008** — `README.md` is the create-next-app default: it points at
  `app/page.tsx`, names Geist rather than Outfit, and never mentions
  `.env.local.example`. Following it produces the root error boundary. This
  materially blocked local signed-in coverage for this audit.
- **DFA-010** — `LibraryView.tsx:25-35,136-160,244-251` window the *rendered*
  count but fetch the entire `/api/watch` response. Real cost at realistic
  library sizes is unmeasured; measure payload, first usable content, filter
  latency and memory on a seeded large account before adding pagination.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | exit 0, no findings |
| `npm run test:run` | exit 0, 489 tests across 58 files, 32.67 s |
| `npm run build` | exit 0, Next.js 16.2.6, 46 static-generation steps |

Those three ran against `cc50c08`, before the fixes above. **Re-run all three
after the patches** — the changed files are covered by
`SelectableOverlay.test.tsx`, `MultiSelectProvider.test.tsx`,
`selectAll.test.tsx` and `DeferredStatsCharts.test.tsx`.

The production pass captured zero console warnings or errors across the
authenticated route matrix, and no loaded image reported `naturalWidth === 0`.
Warm-session navigation timings (single samples, not Core Web Vitals):
dashboard TTFB 50 ms / FCP 576 ms / load 1,068 ms; library 36/244/841; stats
29/228/388.

### Route coverage

Browser-verified signed-in: `/`, `/library`, `/watchlist`, `/streaming`,
`/recommendations`, `/calendar`, `/collections`, `/collections/10`,
`/show/[id]`, `/person/[name]`, `/stats`, `/settings`, an invalid collection
deep link, and the global search overlay. Local public: `/login`, `/signup`,
`/forgot-password`, `/reset-password`, `/does-not-exist`. Viewports: 320×568,
390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080.

Source-only, not browser-verified: `/auth/callback`, `/share/watched/[token]`,
`/share/watchlist/[token]`. `/movies`, `/shows`, `/lists`, `/search` and
`/import` are redirects. `/versus` does not exist in this application.

### Not covered

These are real gaps, not passing results:

- **Every mutation.** No add, log, rating, review, watched toggle, episode
  progress, watchlist change, collection create/delete, import, settings or
  password change was submitted. Needs a non-production Supabase project and a
  seeded test user — which DFA-008 currently makes hard to stand up.
- **Public share pages**, which need a revocable test token; **password reset
  and auth callback**, which need a disposable one-time link.
- **Screen readers, forced-colors mode, full tab-order traversal.** Targeted
  keyboard checks were done (they produced DFA-001 and DFA-014); systematic
  traversal was not.
- **200% browser zoom** — the zoom control never exposed a reliably changed CSS
  viewport, so this is unverified rather than passing.
- **Broken posters, extreme titles, large seeded datasets, offline.**

## What the audit got right

Worth keeping rather than re-auditing: Autumn Pine tokens are centralised and
guarded by synchronisation tests; Outfit loads through `next/font`; there is no
raw `<img>` in production and posters keep their 2:3 ratio through Next Image;
public auth routes sit outside the authenticated shell, so they stay static;
Framer Motion is confined to eight interaction-heavy components; the media
modal traps focus, closes on Escape and restores focus to its opener; toasts
separate status and alert roles. The lint, 489-test and production-build gate
is green.
