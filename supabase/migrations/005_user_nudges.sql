-- Tracks whether a 24h onboarding nudge email has been sent per user.
-- One row = nudge sent. Absence = not yet sent.

create table if not exists user_nudges (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  nudge_sent_at timestamptz not null default now()
);

-- Returns users whose earliest tracked item is 24+ hours old and who have
-- not yet received a nudge. Returns one row per user with the URL of their
-- first item (used for ICP-aware copy).
create or replace function get_nudge_candidates()
returns table (user_id uuid, first_item_url text)
language sql security definer
as $$
  select distinct on (ti.user_id)
    ti.user_id,
    ti.url as first_item_url
  from tracked_items ti
  where ti.created_at <= now() - interval '24 hours'
    and ti.user_id not in (select un.user_id from user_nudges un)
  order by ti.user_id, ti.created_at asc;
$$;
