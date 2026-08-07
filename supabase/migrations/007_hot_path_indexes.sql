-- Indexes on the columns the app actually filters and joins on (audit B11).
--
-- Several indexes named in the audit turned out to be redundant: a UNIQUE
-- constraint already creates a btree index, which also serves lookups on any
-- leading prefix of its columns. So these need nothing:
--   episode_progress(user_id)  -- unique(user_id, season_id, episode_number)
--   followed_shows(user_id)    -- unique(user_id, media_id)
--   watchlist_items(user_id)   -- unique(user_id, media_id) (005 added a
--                                 second, redundant index; left alone)
--   list_items(list_id)        -- unique(list_id, media_id)
--   seasons(media_id)          -- unique(media_id, season_number)
--
-- What follows is what's genuinely uncovered. Postgres does not index foreign
-- keys automatically, so the media_id indexes also stop `delete from media`
-- doing a sequential scan of each child table.

-- watch_entries is the most-read table in the app (dashboard, stats, library,
-- recommendations, export) and had no index on user_id at all. Every one of
-- those reads is `where user_id = ? order by watched_at desc`, so index both
-- together and the sort comes free.
CREATE INDEX IF NOT EXISTS idx_watch_entries_user_watched_at
  ON watch_entries(user_id, watched_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_entries_media_id
  ON watch_entries(media_id);

-- app/page.tsx resolves Continue Watching with `where season_id in (...)`.
-- season_id is not the leading column of the unique constraint, so that
-- index can't serve this.
CREATE INDEX IF NOT EXISTS idx_episode_progress_season_id
  ON episode_progress(season_id);

-- lists has no unique constraint involving user_id.
CREATE INDEX IF NOT EXISTS idx_lists_user_id
  ON lists(user_id);

-- Trailing columns of their tables' unique constraints, so uncovered.
CREATE INDEX IF NOT EXISTS idx_watchlist_items_media_id
  ON watchlist_items(media_id);

CREATE INDEX IF NOT EXISTS idx_list_items_media_id
  ON list_items(media_id);

CREATE INDEX IF NOT EXISTS idx_followed_shows_media_id
  ON followed_shows(media_id);
