-- Per-episode metadata, so the tracker can say "E4 · Fly" instead of "E4"
-- (audit F2). `seasons` only ever stored episode_count, which is why the grid
-- has never been able to render anything but numbers.
--
-- Like media and seasons this is shared TMDB cache, not user data: public read,
-- authenticated write. Episode *progress* stays where it is — that table is the
-- one that is per-user, and it deliberately keys on (season_id, episode_number)
-- rather than an episodes.id, so nothing here changes how progress is stored.
create table if not exists episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  episode_number integer not null,
  name text,
  air_date date,
  overview text,
  runtime_mins integer,
  still_url text,
  unique(season_id, episode_number)
);

-- overview, runtime_mins and still_url are not rendered yet. They arrive in the
-- same /tv/{id}/season/{n} payload as the name and air date, so storing them
-- costs one column each now versus re-fetching every season of every show later
-- (runtime_mins in particular is the honest input for the Hours stat, which
-- currently multiplies one show-level average by the episode count).

-- No separate index on season_id: the unique constraint's btree already serves
-- lookups on its leading column, which is every read this table gets.

alter table episodes enable row level security;

create policy "episodes public read" on episodes for select using (true);
create policy "episodes authenticated insert" on episodes for insert with check (auth.uid() is not null);
create policy "episodes authenticated update" on episodes for update using (auth.uid() is not null);
