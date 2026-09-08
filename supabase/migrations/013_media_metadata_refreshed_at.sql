-- Track when media metadata was last refreshed from TMDB.
--
-- Cached media rows previously had no freshness bound. Once written, a title
-- would never re-fetch from TMDB unless vote_average was null or a show had no
-- seasons. Upstream corrections and new seasons were never picked up.
--
-- Intentionally nullable and unbackfilled: NULL reads as stale, allowing
-- existing rows to refresh lazily on next access instead of triggering a
-- bulk backfill across the table.

ALTER TABLE media ADD COLUMN IF NOT EXISTS metadata_refreshed_at timestamptz;
