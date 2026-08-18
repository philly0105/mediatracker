-- Migration 011: Performance, Security, and RLS Optimization
-- Synthesized from multi-agent backend audit and Claude Opus 5 adversarial review.

-- 1. Safely deduplicate any existing non-rewatch watch_entries, preserving the richest row (rating/review)
DELETE FROM watch_entries w USING (
  SELECT id, row_number() OVER (
    PARTITION BY user_id, media_id
    ORDER BY (rating IS NOT NULL)::int + (review IS NOT NULL)::int DESC, created_at ASC
  ) rn
  FROM watch_entries WHERE rewatch = false
) d WHERE w.id = d.id AND d.rn > 1;

-- 2. Partial Unique Index to eliminate check-then-insert TOCTOU race conditions on first watches
CREATE UNIQUE INDEX IF NOT EXISTS uniq_watch_entries_user_media_original
  ON watch_entries (user_id, media_id)
  WHERE rewatch = false;

-- 3. Share Token Indexes to eliminate sequential scans on public token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_watched_share_token
  ON user_settings(watched_share_token)
  WHERE watched_share_token IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_watchlist_share_token
  ON user_settings(watchlist_share_token)
  WHERE watchlist_share_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lists_share_token
  ON lists(share_token)
  WHERE share_token IS NOT NULL;

-- 4. Composite Hot-Path Query Indexes
-- Default watchlist sort (added_at DESC without priority filter)
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_added_at
  ON watchlist_items(user_id, added_at DESC);

-- Watchlist section sorting (must_watch, want_to_watch, someday)
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_priority_added_at
  ON watchlist_items(user_id, priority, added_at DESC);

-- Dashboard recent watch entries & recommendations sorting
CREATE INDEX IF NOT EXISTS idx_watch_entries_user_created_at
  ON watch_entries(user_id, created_at DESC);

-- List items ordering
CREATE INDEX IF NOT EXISTS idx_list_items_list_added_at
  ON list_items(list_id, added_at DESC);

-- Replace redundant episode_progress index with covering index
DROP INDEX IF EXISTS idx_episode_progress_user_watched_at;
CREATE INDEX IF NOT EXISTS idx_episode_progress_user_season_watched
  ON episode_progress (user_id, season_id) INCLUDE (watched_at, episode_number);

-- 5. RLS InitPlan Optimization: Wrap auth.uid() in (SELECT auth.uid())
-- Wrapping auth.uid() in a scalar subquery transforms per-row function re-evaluations
-- into a single InitPlan evaluated once per query (10x-50x speedup).
ALTER POLICY "own watch_entries" ON watch_entries
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "own episode_progress" ON episode_progress
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "own watchlist_items" ON watchlist_items
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "own lists" ON lists
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "own user_settings" ON user_settings
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "own followed_shows select" ON followed_shows
  USING (user_id = (SELECT auth.uid()));

ALTER POLICY "own followed_shows insert" ON followed_shows
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "own followed_shows delete" ON followed_shows
  USING (user_id = (SELECT auth.uid()));

-- Fix list_items RLS: replace slow IN subquery with correlated EXISTS and WITH CHECK
DROP POLICY IF EXISTS "own list_items" ON list_items;

CREATE POLICY "own list_items" ON list_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_items.list_id
        AND l.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists l
      WHERE l.id = list_items.list_id
        AND l.user_id = (SELECT auth.uid())
    )
  );

ALTER POLICY "media authenticated insert" ON media
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY "media authenticated update" ON media
  USING ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY "seasons authenticated write" ON seasons
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY "seasons authenticated update" ON seasons
  USING ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY "episodes authenticated insert" ON episodes
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

ALTER POLICY "episodes authenticated update" ON episodes
  USING ((SELECT auth.uid()) IS NOT NULL);

-- 6. Rewrite recent_watching_media_ids RPC:
-- Filters out 100% completed shows directly in SQL and adds deterministic tie-breaking on DATE.
CREATE OR REPLACE FUNCTION recent_watching_media_ids(max_shows integer DEFAULT 10)
RETURNS TABLE (media_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH per_show AS (
    SELECT s.media_id,
           max(ep.watched_at)                                AS last_watched,
           count(DISTINCT (ep.season_id, ep.episode_number)) AS watched_count
    FROM episode_progress ep
    JOIN seasons s ON s.id = ep.season_id
    WHERE ep.user_id = (SELECT auth.uid())
    GROUP BY s.media_id
  ),
  totals AS (
    SELECT s.media_id, sum(s.episode_count) AS total_count
    FROM seasons s
    WHERE s.media_id IN (SELECT per_show.media_id FROM per_show)
    GROUP BY s.media_id
  )
  SELECT p.media_id
  FROM per_show p
  JOIN totals t USING (media_id)
  WHERE p.watched_count < t.total_count
  ORDER BY p.last_watched DESC, p.media_id DESC
  LIMIT greatest(coalesce(max_shows, 10), 0);
$$;

REVOKE EXECUTE ON FUNCTION recent_watching_media_ids(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION recent_watching_media_ids(integer) TO authenticated;

-- 7. Hardened Public Share RPC Functions (STABLE, stripped private review/id)
CREATE OR REPLACE FUNCTION public.shared_watched(p_token uuid)
RETURNS TABLE (watched_at date, rating numeric, media jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT we.watched_at, we.rating, to_jsonb(m) AS media
  FROM user_settings us
  LEFT JOIN watch_entries we ON we.user_id = us.user_id
  LEFT JOIN media m ON m.id = we.media_id
  WHERE us.watched_share_token = p_token
  ORDER BY we.watched_at DESC NULLS LAST
$$;

CREATE OR REPLACE FUNCTION public.shared_watchlist(p_token uuid)
RETURNS TABLE (priority text, added_at timestamptz, media jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wi.priority, wi.added_at, to_jsonb(m) AS media
  FROM user_settings us
  LEFT JOIN watchlist_items wi ON wi.user_id = us.user_id
  LEFT JOIN media m ON m.id = wi.media_id
  WHERE us.watchlist_share_token = p_token
  ORDER BY wi.added_at DESC NULLS LAST
$$;

CREATE OR REPLACE FUNCTION public.shared_list(p_token uuid)
RETURNS TABLE (name text, items jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.name,
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', li.id, 'media', to_jsonb(m))
        ORDER BY li.added_at DESC
      ) FILTER (WHERE li.id IS NOT NULL),
      '[]'::jsonb
    ) AS items
  FROM lists l
  LEFT JOIN list_items li ON li.list_id = l.id
  LEFT JOIN media m ON m.id = li.media_id
  WHERE l.share_token = p_token AND l.is_shared = true
  GROUP BY l.id, l.name
$$;

GRANT EXECUTE ON FUNCTION public.shared_watched(uuid)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shared_watchlist(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shared_list(uuid)      TO anon, authenticated;
