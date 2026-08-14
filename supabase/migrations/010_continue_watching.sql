-- Supporting index for Dashboard Continue Watching query:
-- speeds up querying recent episode progress for a user ordered by watched_at desc.

CREATE INDEX IF NOT EXISTS idx_episode_progress_user_watched_at
  ON episode_progress(user_id, watched_at DESC);
