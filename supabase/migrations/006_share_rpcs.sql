-- Token-bound public read for share links.
--
-- RLS stays fully locked (own-data only). These SECURITY DEFINER functions
-- bypass RLS internally but only return rows when the caller supplies the
-- matching share token, so shared data is readable exactly by someone holding
-- the link — not by anyone with the public anon key.
--
-- LEFT JOIN from the owning row (user_settings / lists) so a valid-but-empty
-- share returns one marker row (data columns null) instead of zero rows. The
-- pages 404 only when the token matches nothing.

create or replace function public.shared_watched(p_token uuid)
returns table (id uuid, watched_at date, rating numeric, review text, media jsonb)
language sql
security definer
set search_path = public
as $$
  select we.id, we.watched_at, we.rating, we.review, to_jsonb(m) as media
  from user_settings us
  left join watch_entries we on we.user_id = us.user_id
  left join media m on m.id = we.media_id
  where us.watched_share_token = p_token
  order by we.watched_at desc nulls last
$$;

create or replace function public.shared_watchlist(p_token uuid)
returns table (id uuid, priority text, added_at timestamptz, media jsonb)
language sql
security definer
set search_path = public
as $$
  select wi.id, wi.priority, wi.added_at, to_jsonb(m) as media
  from user_settings us
  left join watchlist_items wi on wi.user_id = us.user_id
  left join media m on m.id = wi.media_id
  where us.watchlist_share_token = p_token
  order by wi.added_at desc nulls last
$$;

create or replace function public.shared_list(p_token uuid)
returns table (name text, items jsonb)
language sql
security definer
set search_path = public
as $$
  select l.name,
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', li.id, 'media', to_jsonb(m))
        order by li.added_at desc
      ) filter (where li.id is not null),
      '[]'::jsonb
    ) as items
  from lists l
  left join list_items li on li.list_id = l.id
  left join media m on m.id = li.media_id
  where l.share_token = p_token and l.is_shared = true
  group by l.id, l.name
$$;

grant execute on function public.shared_watched(uuid)   to anon, authenticated;
grant execute on function public.shared_watchlist(uuid) to anon, authenticated;
grant execute on function public.shared_list(uuid)      to anon, authenticated;
