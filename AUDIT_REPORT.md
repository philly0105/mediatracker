# MediaTracker (DorfMovies) — Comprehensive Audit Report

**Date:** 2026-08-23
**Commit audited:** `0e7a5dd3d120a1592255f7c4f42a0b7fa3de9316` (branch `master`)
**Environment:** Windows 11, Node via npx, Next.js 16.2.6 / React 19.2.4 / Supabase SSR 0.10.3 / Vitest 4.1.8 / Tailwind 4 / TypeScript 5

**Commands run for this audit:**

- `npx tsc --noEmit`
- `npx vitest run --passWithNoTests` (full suite)
- Byte-level file comparison (`fc /b`) of drifted design-system files
- Manual review of all `app/api/**/route.ts` handlers, `lib/supabase/*`, `lib/auth.ts`, `lib/tmdb.ts`, admin backfill routes, and the `(app)` layout/page auth guards

**Relation to prior audits:** builds on `docs/AUDIT.md` and `docs/AUDIT-2026-08-07.md`. Items previously flagged there (admin route failing open when `ADMIN_SECRET` unset, CSV formula injection) were re-verified as fixed during this pass.

---

## 1. Executive Summary

The codebase is in **good health overall**:

- ✅ **TypeScript is clean** — `tsc --noEmit` produces zero errors.
- ⚠️ **Test suite: 406 tests, 399 passing, 7 failing** across 2 files.
  - 6 failures are the design-system vendored-copy sync tests (`designSystemSync.test.ts`). Investigation shows these are **line-ending drift only (CRLF vs LF)** — the CSS content itself is identical. No real design regression.
  - 1 failure is an **environment bug inside the test itself**, not the app code: `MediaModalProvider.test.tsx`'s ownership test uses forward-slash regexes against Windows backslash paths, so on Windows it flags the very file it means to exempt. It passes on POSIX.
- 🔴 **One genuine robustness gap:** unguarded `await request.json()` across API mutation routes. A malformed/missing JSON body throws and surfaces as an opaque **500** instead of a **400**. Worst-affected: `app/api/watch/route.ts` (POST/PATCH/DELETE). The signup route already demonstrates the correct try/catch pattern; it just wasn't propagated to the other routes.
- ✅ **Auth & security posture is strong:** every API handler checks `supabase.auth.getUser()` and returns 401; mutations are scoped `.eq('user_id', user.id)`; admin endpoints use timing-safe Bearer comparison and fail closed; invite-code signup has rate limiting and open-redirect protection; CSV export escapes formula injection.
- ✅ **Performance work is deliberate and well-commented:** tiered TMDB response caching (1h→7d), paged fetching that defeats PostgREST's silent 1000-row cap, wire-weight trimming of unused fields, and `react.cache` deduplication of auth reads.

No data-loss, security, or correctness bugs were found. The remediation plan at the end is small: one error-handling fix, one line-ending normalization, one test portability fix.

---


## 2. Test Suite Results

```
Test Files   2 failed | 48 passed (50)
Tests        7 failed | 399 passed (406)
Duration     ~6.3s
```

### 2.1 The 6 failing design-system sync tests

File: `app/styles/design-system/__tests__/designSystemSync.test.ts`

This test exists specifically to catch silent drift between the authored design system (`.agents/skills/dorfmovies-design/`) and the vendored copy the build imports (`app/styles/design-system/`). It compares each token stylesheet and `styles.css` **byte-for-byte** via `readFileSync(..., 'utf8')`.

| # | Failing test | Status |
|---|---|---|
| 1 | `tokens/fonts.css is byte-identical to the skill` | ❌ fail |
| 2 | `tokens/keyframes.css is byte-identical to the skill` | ❌ fail |
| 3 | `tokens/spacing.css is byte-identical to the skill` | ❌ fail |
| 4 | `tokens/textures.css is byte-identical to the skill` | ❌ fail |
| 5 | `tokens/typography.css is byte-identical to the skill` | ❌ fail |
| 6 | `styles.css is byte-identical to the skill` | ❌ fail |

Passing siblings: `ships the same token files as the skill`, `tokens/colors.css`, `tokens/effects.css` — confirming the file *sets* match and two files happen to be EOL-clean.

**Root cause (verified by `fc /b`):** at the first differing offset the skill copy has `0A` (LF) where the vendored copy has `0D 0A` (CRLF); every subsequent byte is shifted but otherwise identical. This is pure line-ending divergence, not content drift. The repo has `core.autocrlf = true` and **no `.gitattributes`**, so the two copies were normalized differently between authoring and checkout, and the byte-exact assertion trips.

Consequences if unfixed: none at runtime (CSS is EOL-agnostic), but the sync guard is effectively dead — a future *real* edit would be indistinguishable from this noise, inviting someone to delete or ignore the test.

Full analysis in §7 (Design System Drift).

### 2.2 The 7th failure (not a sync test, Windows-only)

File: `components/__tests__/MediaModalProvider.test.tsx` → `"MediaInfoModal ownership > is imported by MediaModalProvider and nothing else"`

```
AssertionError: expected [ 'components\\MediaModalProvider.tsx' ] to deeply equal []
```

The test scans all source files for direct imports of `MediaInfoModal` and exempts exactly two files via the regex `/components\/(MediaInfoModal|MediaModalProvider)\.tsx$/` — built with **forward slashes**. On Windows, paths arrive as `components\MediaModalProvider.tsx`, so the exemption never matches and the provider flags *itself* as an offender. There is no actual ownership violation; `MediaInfoModal` is imported only by `MediaModalProvider.tsx` as intended. Fix is path-normalization (separator-agnostic matching) before filtering.

---

## 3. TypeScript Status

```
$ npx tsc --noEmit
(no output — zero errors)
```

Strict type-checking across `app/`, `components/`, `lib/` passes cleanly. Notable quality signals observed during review:

- TMDB raw payloads are modeled honestly (`TmdbMovieListItem | TmdbShowListItem` discriminated unions, genuinely optional fields left optional rather than pretended into existence).
- PATCH handlers build typed update maps validated field-by-field through `lib/validation`.
- `lib/validation` (`parseRating`, `parseMediaType`, `parseTmdbId`, `parseDate`, `parseUuid`, `parseText`, `badRequest`) gives routes a uniform validation vocabulary.

---


## 4. Finding: Unhandled JSON Body Parsing in API Routes

**Severity: Medium (robustness/observability, not security)**

### 4.1 The flagged file — `app/api/watch/route.ts`

Three handlers call `await request.json()` with **no try/catch**:

| Handler | Line | Call |
|---|---|---|
| `POST` | 61 | `const { tmdb_id, type, rating, ... } = await request.json()` |
| `PATCH` | 124 | `const { id, rating, review, watched_at } = await request.json()` |
| `DELETE` | 164 | `const { id } = await request.json()` |

When a client sends a non-JSON body, an empty body, or invalid JSON, `request.json()` rejects. In a Next.js route handler the rejection is unhandled: the framework returns a generic **500 Internal Server Error** instead of a **400 Bad Request**, and the error lands in server logs as a stack trace rather than a handled client mistake. All the careful per-field validation below those lines (`parseTmdbId`, `parseRating`, …) never runs — the app's own "invalid input → 400" contract is bypassed at exactly the first parsing step.

This is not hypothetical-hardening: any network hiccup, proxy rewrite, or misbehaving client hits it, and the resulting 500s pollute error telemetry with non-bugs.

### 4.2 Scope beyond the flagged file

The same unguarded pattern appears at **11 call sites across 5 route files**:

| File | Lines |
|---|---|
| `app/api/watch/route.ts` | 61, 124, 164 |
| `app/api/watchlist/route.ts` | 163, 190, 213 |
| `app/api/episodes/route.ts` | 52, 84 |
| `app/api/follow/route.ts` | 35, 52 |
| `app/api/import/route.ts` | 12 |

### 4.3 The fix already exists in-repo

`app/api/auth/signup/route.ts:46–51` does it correctly:

```ts
let body: Record<string, unknown>
try {
  body = await request.json()
} catch {
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
```

**Recommended:** extract this into a small helper in `lib/validation` (e.g. `readJson(request)` returning `{ ok, value }` consistent with the existing parser result shape) and use it at all 11 sites. Mechanical change, fully compatible with existing test conventions.

---

## 5. Auth & Security Review

**Overall verdict: solid.** The threat model (single-user-instance personal app, deployed publicly on Vercel) is clearly thought through, with in-code comments documenting each decision.

### 5.1 What's done right

- **Per-route authentication.** Every handler in `app/api/**` begins with `supabase.auth.getUser()` and returns `401 Unauthorized` on failure — GET, POST, PATCH, DELETE alike. No exceptions found.
- **Row scoping.** All reads and writes filter `.eq('user_id', user.id)` explicitly; RLS is treated as a second layer, not the only one (prior audit item C2's belt-and-suspenders request is satisfied).
- **Admin endpoints fail closed.** All three backfill routes return **503 when `ADMIN_SECRET` is unset** (previously they compared against the literal `"Bearer undefined"` — fixed per `docs/AUDIT-2026-08-07.md`). Token comparison digests both sides with SHA-256 before `timingSafeEqual`, avoiding length/timing leaks.
- **Signup gating.** `SIGNUP_INVITE_CODE` is server-only (never reaches the client bundle); missing secret ⇒ signup disabled (fail closed); comparison is constant-time via `lib/auth.isValidInviteCode`; per-IP in-memory throttle (10 attempts / 10 min) blocks brute-forcing the code. Comments honestly label the throttle a speed bump, not a lock.
- **Open-redirect protection.** `safeNextPath` rejects protocol-relative (`//evil.com`), absolute URLs, and backslash tricks (`/\evil.com`) on the attacker-influenced `next` parameter carried through emailed links.

## 6. Performance & TMDB Caching

### 6.1 TMDB caching (`lib/tmdb.ts`)

Next 16 fetch defaults to `no-store`; without explicit caching every call is a live round-trip to TMDB. The library defines five volatility-matched windows applied via fetch `revalidate`:

| Window | Applied to |
|---|---|
| 1 h | search (freshness matters for re-queries) |
| 6 h | trending / discover / popular listings |
| 12 h | upcoming-release schedules |
| 24 h | per-title recommendation lists |
| 7 d | detail / credits / collection metadata (near-static) |

Well-judged: static data gets long caching without risking stale trending lists. Upcoming releases fan out with `Promise.all` (bounded `MAX_FOLLOWED` for followed-show lookups), de-duplicate movie/show collisions, and degrade gracefully to `[]` on TMDB errors.

### 6.2 Data-fetch hardening

- **Pagination vs the silent 1000-row cap.** `/api/watch` uses `fetchAllRows` range-window paging because PostgREST caps responses at 1000 rows *without erroring* — the Library used to silently freeze at 1000 titles. Ordering includes an `id` tiebreaker so same-day entries don't shuffle between pages, and the response reports `truncated`.
- **Wire-weight trimming.** `overview` was deliberately dropped from the watch select (nothing rendered it; client-side search doesn't read it), saving hundreds of bytes per row; `MediaInfoModal` takes the synopsis from `/api/tmdb/details`, which already returned it.
- **PostgREST join semantics documented in-code.** `!inner` vs left-join select strings switch based on whether a type filter applies — correct use of `!inner` so `.eq('media.type')` filters parent rows rather than only embedded resources.
- **Render-tree dedup.** `react.cache()` on `getAuthenticatedUser` collapses multiple auth round-trips per render into one.
- **Client-side filtering/sorting** of the fetched set keeps API response shape stable.

No performance defects found. The main residual cost is inherent: the client filters/sorts the full entry set after fetch — fine at personal-library scale.

---

## 7. Design System Drift (Deep Dive)

**Architecture.** The design system is authored in `.agents/skills/dorfmovies-design/` (skill-facing reference: tokens, `_ds_bundle.js`, UI kits) and vendored into `app/styles/design-system/`, which the build imports. Per the reskin spec (`docs/superpowers/specs/2026-06-19-dorfmovies-design-reskin.md`), production CSS intentionally does not build-depend on the regenerable skill folder — hence the vendored copy, and hence `designSystemSync.test.ts` as the drift tripwire. A separate, documented duplication exists in `lib/ogCard.tsx`, which hard-codes palette literals because Satori (next/og) resolves no CSS variables; its comment points at `tokens/colors.css` to keep in step.

**Current state.** Six of nine comparisons fail, all on line endings:

- Skill copies: LF (`0A`)
- Vendored working-tree copies: CRLF (`0D 0A`)
- Content bytes otherwise identical (binary diff shows the first difference is the CR insertion, then a pure offset shift)

**Why it happened.** `git config core.autocrlf = true` with no `.gitattributes` rules covering either tree (`git check-attr` returns unspecified for both). Files authored/written by different toolchains landed with different EOLs and checkout normalization didn't converge them. Because the test asserts raw-string equality, EOL differences fail it even though the *rendered* styles are identical.

**Impact.**
- Runtime: none today (CSS ignores EOL).
- Process: real. The tripwire fires constantly, so its signal is dead — a genuine token retune in the skill alone would be one more red test nobody trusts. Worse, someone may "fix" it by deleting the guard entirely, losing drift detection.

**Fix options (pick one):**
1. **Preferred:** add a `.gitattributes` pinning EOLs (e.g. `*.css text eol=lf`), run `git add --renormalize .`, commit. Makes both trees deterministic regardless of contributor OS, so the byte-exact test works everywhere including Windows.
2. Make the test EOL-insensitive (compare `content.replace(/\r\n/g, '\n')`). Keeps the guard meaningful but leaves repo EOLs nondeterministic.
3. Re-save the vendored copies with LF matching the skill (fixes now; recurs on the next normalization surprise).

Option 1 is the durable fix; option 2 can be layered on for robustness.

---

- **CSV injection defense.** `app/api/export/route.ts` prefixes cells beginning with `= + - @ TAB CR` with a tab and quotes/escapes properly.
- **Auth redirect handling.** `/auth/callback` tests confirm off-site redirects are refused, exchange failures surface to the user, and missing codes are handled.
- **Page-level guards.** Pages under `(app)` call `getAuthenticatedUser()` and `redirect('/login')` when absent (e.g. `app/(app)/page.tsx:36–37`); the layout uses the cached helper so duplicate auth reads collapse into one round-trip per render.

### 5.2 Observations (low severity, documented trade-offs)

1. **No middleware.ts — guards are per-entry-point.** Auth enforcement lives in each page and route handler rather than central middleware. Consistently applied today, but nothing structural stops a *future* page or route shipping without its guard. Acceptable at this project size; remember it when adding endpoints.
2. **Signup rate limiting is in-memory per instance.** Resets on cold start; no shared state across serverless instances. Deliberate (documented in-code); the long invite code is the real defense.
3. **`x-forwarded-for` is spoofable.** Used only for the throttle bucket, never for authorization — correct usage, noted for completeness.
4. **Untracked `test-output.txt`** at repo root (test-run debris). Delete or gitignore.

No vulnerabilities found in this pass.

---


## 8. Prioritized Remediation Plan

| # | Priority | Item | Effort | Files |
|---|---|---|---|---|
| 1 | **P1** | Guard all `request.json()` calls → return 400 on parse failure. Add a shared `readJson` helper to `lib/validation` following the signup-route pattern; apply at all 11 sites. | Small (~1 hr incl. tests) | `app/api/watch/route.ts`, `watchlist/route.ts`, `episodes/route.ts`, `follow/route.ts`, `import/route.ts`, `lib/validation.ts` |
| 2 | **P1** | Normalize design-system EOLs: add `.gitattributes` (`*.css text eol=lf`), `git add --renormalize .`, commit. Optionally make the sync test EOL-insensitive as belt-and-suspenders. Restores the drift tripwire's signal. | Small (~30 min) | `.gitattributes`, `app/styles/design-system/**` |
| 3 | **P2** | Fix Windows path handling in the MediaInfoModal ownership test (separator-agnostic path matching) so the suite is green cross-platform. | Trivial (~15 min) | `components/__tests__/MediaModalProvider.test.tsx` |
| 4 | **P3** | Housekeeping: remove/gitignore stray `test-output.txt` at repo root. | Trivial | repo root |

**Definition of done:** `npx tsc --noEmit` clean (already true), `npx vitest run` → 50/50 files and 406/406 tests passing on Windows and POSIX, malformed-body requests to `/api/watch` return 400 with a JSON error message.

---

## Appendix A — Failure Inventory (verbatim from `vitest run`)

```
❯ app/styles/design-system/__tests__/designSystemSync.test.ts (9 tests | 6 failed)
     ✓ ships the same token files as the skill
     ✓ tokens/colors.css is byte-identical to the skill
     ✓ tokens/effects.css is byte-identical to the skill
     × tokens/fonts.css is byte-identical to the skill
     × tokens/keyframes.css is byte-identical to the skill
     × tokens/spacing.css is byte-identical to the skill
     × tokens/textures.css is byte-identical to the skill
     × tokens/typography.css is byte-identical to the skill
     × styles.css is byte-identical to the skill

❯ components/__tests__/MediaModalProvider.test.tsx (8 tests | 1 failed)
     × is imported by MediaModalProvider and nothing else
       AssertionError: expected [ 'components\\MediaModalProvider.tsx' ] to deeply equal []
```

## Appendix B — Evidence Commands

```powershell
npx tsc --noEmit                                  # clean
npx vitest run --passWithNoTests                  # 399/406 pass, 7 fail
fc /b .agents\skills\dorfmovies-design\tokens\spacing.css `
     app\styles\design-system\tokens\spacing.css  # first diff: 0A vs 0D 0A → EOL-only
git config core.autocrlf                          # true
git check-attr text eol -- <both css paths>       # unspecified (no .gitattributes rules)
Select-String -Path app\api\**\route.ts -Pattern 'request\.json()'   # 11 sites, 5 files
```
