create table followed_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_id uuid not null references media(id) on delete cascade,
  unique(user_id, media_id)
);

alter table followed_shows enable row level security;

create policy "own followed_shows select" on followed_shows for select using (user_id = auth.uid());
create policy "own followed_shows insert" on followed_shows for insert with check (user_id = auth.uid());
create policy "own followed_shows delete" on followed_shows for delete using (user_id = auth.uid());
