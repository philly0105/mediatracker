# Backend Hardening — Implementation Spec (2026-08-14)

Refined from a Gemini backend audit. Every claim below was re-verified against the
working tree at `ed03831`. Where the original audit was wrong about severity or
prescribed a heavier fix than the problem warrants, this spec says so and
overrides it.

**Repo constraints that bind this work:**
- Next.js 16.2.6. `AGENTS.md` warns this version has breaking changes vs. training
  data. Read `node_modules/next/dist/docs/` before touching route handlers or
  page params.
- `zod` exists in `node_modules` but is **not** a direct dependency in
  `package.json`. Do **not** import it. Hand-roll validation. Do not add deps.
- Verification commands: `npx tsc --noEmit`, `npm run test:run`, `npm run lint`,
  `npm run build`. All four must pass.

---

## Task 1 — Fix TMDB ID namespace collision (P0, data integrity)

**Verified.** `supabase/migrations/001_initial.sql:7` declares
`tmdb_id integer not null unique`. No later migration alters it. TMDB uses
independent ID sequences per media type, so movie 550 and show 550 are different
titles that collide on this constraint. `lib/media.ts` upserts with
`onConflict: 'tmdb_id'`, so writing show 550 overwrites the movie 550 row
in place — silently repointing every `watch_entries`, `watchlist_items`,
`seasons`, and `list_items` FK at the wrong title.

**Important simplification the original audit missed:** moving from
`UNIQUE(tmdb_id)` to `UNIQUE(tmdb_id, type)` is a *relaxation*. No existing row
can violate the wider constraint, so **no dedupe or backfill step is needed** and
the migration cannot fail on existing data. Write it as a straight swap.

### 1a. New migration `supabase/migrations/009_media_tmdb_type_unique.sql`

- Drop the existing unique constraint on `media.tmdb_id`. It was created
  inline, so Postgres named it `media_tmdb_id_key` — but do not hardcode that
  blindly; use `alter table media drop constraint if exists media_tmdb_id_key`.
- Add `alter table media add constraint media_tmdb_id_type_key unique (tmdb_id, type)`.
- Keep the migration idempotent (`if exists` / `if not exists` guards) so
  re-running it is safe.

### 1b. Update `lib/media.ts`

There are **two** `onConflict: 'tmdb_id'` call sites — the primary upsert and the
`PGRST204`/`42703` fallback upsert. Both must become `onConflict: 'tmdb_id,type'`
(PostgREST wants a comma-separated column list with no spaces). Missing the
fallback leaves the bug live on any database still on migration 001/002.

### 1c. Detection query (docs only, no code)

Rows corrupted *before* this fix cannot be recovered by the migration — a movie
row already overwritten into a show row has lost its original data. Add a short
`## Detecting pre-existing corruption` section at the bottom of the migration
file as a SQL comment, giving a query that flags suspect rows: media rows whose
`type` disagrees with the type implied by the `watch_entries` / `watchlist_items`
that point at them. This is diagnostic only — do not write repair code.

---

## Task 2 — Explicit user scoping on list detail page (P0, access control)

**Verified, and worse than the audit reported.** `app/lists/[id]/page.tsx:9`
queries `lists` by `id` with no `.eq('user_id', ...)` — and the page never calls
`supabase.auth.getUser()` at all. It relies entirely on RLS.

RLS is doing its job today, but a single mistaken policy change turns this into a
full read of any user's list. Fix:

- Call `getUser()` at the top; `redirect('/login')` when there is no user
  (match the pattern in `app/page.tsx:36-37`).
- Add `.eq('user_id', user.id)` to the `lists` query.
- Leave the `list_items` query scoped by `list_id` — it is transitively scoped
  once the parent list is confirmed to belong to the user.

Then grep the rest of `app/` and `app/api/` for Supabase reads on user-owned
tables (`watch_entries`, `watchlist_items`, `lists`, `list_items`,
`episode_progress`, `followed_shows`) that lack an explicit `.eq('user_id', ...)`
and add it. **Exception:** do not add user scoping to the public share routes
(`/share/...`, `app/api/settings/share`) — those are intentionally readable
without a session. Report anything ambiguous instead of guessing.

---

## Task 3 — Request validation (P1, reliability)

**Verified.** `app/api/watch/route.ts:38` checks only that `tmdb_id` and `type`
are present. `rating` is passed straight through to a column declared
`numeric(2,1) check (rating >= 0.5 and rating <= 5.0)`. A body of `{rating: 7}`
raises a Postgres check-constraint violation, hits the generic
`if (error) return ... status: 500`, and returns a 500 with a raw Postgres
message. Same shape in the `PATCH` handler, which additionally spreads into an
`any`-typed `updates` object with no validation at all.

### 3a. Create `lib/validation.ts`

Small hand-rolled helpers — no dependencies, no schema DSL. Export narrow
functions that return either a parsed value or an error string:

- `parseRating(v)` — allow `null`/`undefined` (rating is optional); otherwise
  require a number in `[0.5, 5.0]` at 0.5 granularity.
- `parseMediaType(v)` — must be exactly `'movie'` or `'show'`.
- `parseTmdbId(v)` — positive integer.
- `parseDate(v)` — `YYYY-MM-DD`, and must parse to a real calendar date.
- `parsePriority(v)` — match the allowed values in the `watchlist_items` check
  constraint; read the constraint out of `001_initial.sql` rather than assuming.

Add a `badRequest(message)` helper returning
`NextResponse.json({ error: message }, { status: 400 })` so error shape is
consistent with what clients already parse (`data.error`).

### 3b. Apply to write routes

Wire the validators into the `POST`/`PATCH`/`PUT` handlers of `/api/watch`,
`/api/watchlist`, `/api/episodes`, `/api/lists`, `/api/lists/[id]`,
`/api/lists/[id]/items`, and `/api/import`. Validate before any Supabase call or
`upsertMedia` call — a bad rating should never reach TMDB or the database.

Preserve existing response shapes exactly. `/api/watch` POST already returns 409
`{error: 'Already in your watch history'}`; clients depend on these strings.
Do not restructure them.

### 3c. Tests

Add `lib/__tests__/validation.test.ts` covering the boundaries: rating `0.4`,
`0.5`, `5.0`, `5.1`, `7`, `null`, `'4'`; type `'tv'` vs `'show'`; date
`'2026-02-30'`. Follow the existing vitest style in `lib/__tests__/`.

---

## Task 4 — Dashboard Continue Watching query (P1, performance)

**Verified.** `app/page.tsx:52-56` fetches *every* `episode_progress` row the
user has ever logged, unbounded, then does the show/season/episode join in JS on
every dashboard render.

The audit said "streamline the queries" without saying how, and the obvious
naive fix is wrong: you **cannot** just add `.limit(n)` to the progress query,
because `findNextUp` needs the complete watched-episode set for a show to compute
the next episode. Truncating rows produces a wrong "next up".

**Correct fix — narrow by show first, then fetch complete progress for those shows:**

1. Query `episode_progress` ordered by `watched_at desc` to identify the most
   recently active shows, and reduce to the first ~10 distinct `media_id`s.
2. Then fetch the *complete* progress rows for only those `media_id`s, and run
   the existing JS join over that bounded set.

The dashboard already renders a limited row, so capping at ~10 shows changes
nothing user-visible. If step 1 cannot be expressed efficiently through
PostgREST without pulling the same unbounded set, implement it as a Postgres RPC
in a new migration (`010_continue_watching.sql`) returning distinct recent
`media_id`s, and call that instead. Either approach is acceptable — pick one and
say which in the summary.

**Also:** the `episode_progress` query at line 52 sits *after* the `Promise.all`
at line 41 and is awaited separately, serialising a round trip for no reason.
Its result feeds the `mediaIds` computation, so step 1 must stay ordered — but
fold whatever is genuinely independent into the existing `Promise.all`.

### 4b. Supporting index

Add to migration `010`: an index on `episode_progress (user_id, watched_at desc)`
if `007_hot_path_indexes.sql` does not already provide one. **Read
`007_hot_path_indexes.sql` first** and do not duplicate an existing index.

---

## Task 5 — CSV import concurrency (P2, performance)

**Verified.** `components/ImportExportPanel.tsx:97` loops rows with an `await`
inside, issuing one sequential HTTP request per title.

**Overriding the original audit here.** It proposed a new `/api/import/batch`
endpoint. That is the wrong trade: it means a new route, a new request/response
contract, new partial-failure semantics, and it breaks the per-row live progress
UI that `setResults` currently drives. And it would not even be much faster —
the real ceiling is the TMDB API call inside `/api/import`, not HTTP overhead.

**Do instead:** keep the existing endpoint and add a bounded-concurrency worker
pool on the client — a small fixed number of workers (use **5**) pulling from a
shared row index. Roughly a 15-line change to `runImport`.

Requirements:
- Per-row `setResults` updates must keep working, so rows still resolve
  individually in the UI.
- Results must stay in original row order regardless of completion order — the
  existing updates are indexed by `j === i`, so preserve that indexing.
- Keep the existing per-row try/catch so one failure never aborts the run.

Do **not** create `/api/import/batch`.

---

## Explicitly out of scope

Do not implement these. They were in the original audit and are being dropped
deliberately:

- **`createAdminClient()` / service-role admin routes.** The audit called this
  "broken admin script execution" and rated it critical. It is neither. Read
  `app/api/admin/backfill-collections/route.ts:18-28`: the session check is a
  *deliberate guard* with a comment explaining exactly this constraint, and it
  returns an explanatory error rather than silently writing zero rows. These are
  hand-run maintenance endpoints, not part of any automated path. Adding a
  service-role key to the app is a real security surface and needs to be a
  considered decision, not an audit remediation. Leave it.
- **`/api/library/ids` endpoint + HTTP caching.** `lib/useLibraryIds.ts:25`
  does fetch unbounded ID sets, but the payload is integers only — a
  5,000-title library is tens of KB. A new authenticated endpoint plus a cache
  layer is not worth it at this size.
- **Blanket HTTP cache headers on read endpoints.** Needs per-route reasoning
  about staleness after a write; not a mechanical change.

---

## Working agreement

- One commit per task, message prefixed `fix(backend):` or `perf(backend):`.
- Do not reformat, restructure, or "clean up" code outside these tasks. The
  existing explanatory comments in `lib/media.ts` and the admin routes are load-
  bearing — preserve them.
- Do not add dependencies.
- Run all four verification commands before reporting done, and paste real
  output.
- If any task turns out to be wrong or infeasible against the actual code, stop
  and report it rather than implementing something adjacent.
