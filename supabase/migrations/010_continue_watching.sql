-- Supporting index for Dashboard Continue Watching query:
-- speeds up querying recent episode progress for a user ordered by watched_at desc.

CREATE INDEX IF NOT EXISTS idx_episode_progress_user_watched_at
  ON episode_progress(user_id, watched_at DESC);

-- Distinct most-recently-active shows for "Continue Watching".
--
-- The dashboard needs the N shows the user last watched an episode of. Doing
-- that through PostgREST means pulling episode_progress rows and reducing to
-- distinct media_ids in JS, which either fetches the user's entire history or
-- caps the row count and silently loses shows — cap at 100 rows and a single
-- 100-episode binge crowds every other in-progress show off the dashboard.
--
-- Grouping in the database gives exactly the N most recent shows regardless of
-- how lopsided the episode counts are.
--
-- security invoker (the default) so the caller's RLS applies; the explicit
-- auth.uid() predicate is defence-in-depth on top of the "own episode_progress"
-- policy, not a replacement for it.
CREATE OR REPLACE FUNCTION recent_watching_media_ids(max_shows integer DEFAULT 10)
RETURNS TABLE (media_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT s.media_id
  FROM episode_progress ep
  JOIN seasons s ON s.id = ep.season_id
  WHERE ep.user_id = auth.uid()
  GROUP BY s.media_id
  ORDER BY max(ep.watched_at) DESC
  LIMIT greatest(coalesce(max_shows, 10), 0);
$$;

GRANT EXECUTE ON FUNCTION recent_watching_media_ids(integer) TO authenticated;
