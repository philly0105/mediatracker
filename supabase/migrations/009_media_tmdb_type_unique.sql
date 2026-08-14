-- Fix TMDB ID namespace collision: TMDB allocates movie and show IDs independently,
-- so a movie and a show can share the same numeric ID.
-- Drop the single-column unique constraint on tmdb_id and replace it with (tmdb_id, type).

alter table media drop constraint if exists media_tmdb_id_key;
alter table media drop constraint if exists media_tmdb_id_type_key;
alter table media add constraint media_tmdb_id_type_key unique (tmdb_id, type);

-- ## Detecting pre-existing corruption
-- Rows corrupted before this fix cannot be automatically repaired because
-- a movie row overwritten into a show row (or vice versa) lost its original metadata.
--
-- Suspect media rows can be detected where the cached `type` conflicts with child rows:
--
-- select m.id, m.tmdb_id, m.type, m.title
-- from media m
-- where (
--   m.type = 'movie' and exists (
--     select 1 from seasons s where s.media_id = m.id
--   )
-- ) or (
--   m.type = 'show' and not exists (
--     select 1 from seasons s where s.media_id = m.id
--   ) and (
--     exists (select 1 from watch_entries w where w.media_id = m.id)
--     or exists (select 1 from watchlist_items wi where wi.media_id = m.id)
--   )
-- );
