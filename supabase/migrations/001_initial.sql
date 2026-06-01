-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Cached TMDB metadata
create table media (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null unique,
  type text not null check (type in ('movie', 'show')),
  title text not null,
  overview text,
  poster_url text,
  genres text[] default '{}',
  release_year integer,
  runtime_mins integer,
  director text,
  cast_members text[] default '{}'
);

-- TV seasons
create table seasons (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references media(id) on delete cascade,
  season_number integer not null,
  episode_count integer not null,
  unique(media_id, season_number)
);

-- Watched log
create table watch_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  rating numeric(2,1) check (rating >= 0.5 and rating <= 5.0),
  review text,
  watched_at date not null default current_date,
  rewatch boolean not null default false,
  created_at timestamptz not null default now()
);

-- Episode progress
create table episode_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id uuid not null references seasons(id) on delete cascade,
  episode_number integer not null,
  watched_at date not null default current_date,
  unique(user_id, season_id, episode_number)
);

-- Watchlist
create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  priority text not null check (priority in ('must_watch', 'want_to_watch', 'someday')),
  added_at timestamptz not null default now(),
  unique(user_id, media_id)
);

-- Custom lists
create table lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  share_token uuid,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

-- List membership
create table list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references lists(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique(list_id, media_id)
);

-- Profile-level share settings
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  watched_share_token uuid,
  watchlist_share_token uuid
);

-- Row Level Security
alter table watch_entries enable row level security;
alter table episode_progress enable row level security;
alter table watchlist_items enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table user_settings enable row level security;

-- RLS policies: user sees only their own data
create policy "own watch_entries" on watch_entries
  using (user_id = auth.uid());

create policy "own episode_progress" on episode_progress
  using (user_id = auth.uid());

create policy "own watchlist_items" on watchlist_items
  using (user_id = auth.uid());

create policy "own lists" on lists
  using (user_id = auth.uid());

create policy "own list_items" on list_items
  using (list_id in (select id from lists where user_id = auth.uid()));

create policy "own user_settings" on user_settings
  using (user_id = auth.uid());

-- media and seasons are public read (no user_id, shared cache)
alter table media enable row level security;
alter table seasons enable row level security;
create policy "media public read" on media for select using (true);
create policy "media authenticated insert" on media for insert with check (auth.uid() is not null);
create policy "media authenticated update" on media for update using (auth.uid() is not null);
create policy "seasons public read" on seasons for select using (true);
create policy "seasons authenticated write" on seasons for insert with check (auth.uid() is not null);
create policy "seasons authenticated update" on seasons for update using (auth.uid() is not null);
