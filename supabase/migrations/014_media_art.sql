-- Artwork the Spatial Glass design renders: a backdrop for the ambient layer and
-- hero, and the transparent title logo used as the hero title treatment.
--
-- Nullable and not filled here: SQL can't reach TMDB. upsertMedia writes both
-- whenever it refreshes a row's metadata (see 013), and
-- POST /api/admin/backfill-media-art fills the existing rows in one pass. A
-- null logo is also a real end state, since not every title has one on TMDB.
alter table media add column if not exists backdrop_url text;
alter table media add column if not exists logo_url text;
