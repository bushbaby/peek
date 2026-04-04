-- Fix #1 & #2: Add index on tracked_items.user_id
-- Speeds up RLS policy evaluation, user-scoped queries, and ON DELETE CASCADE from auth.users.
create index if not exists tracked_items_user_id_idx on tracked_items (user_id);

-- Fix #1: Partial index for worker query (is_paused = false)
create index if not exists tracked_items_not_paused_idx on tracked_items (is_paused) where is_paused = false;

-- Fix #3: Optimise RLS policy — wrap auth.uid() in subquery so it evaluates once, not per-row
drop policy if exists "Users can manage their own tracked items" on tracked_items;

create policy "Users can manage their own tracked items"
  on tracked_items for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Fix #4: Enable RLS on user_nudges (no policies = default-deny for anon/authenticated)
alter table user_nudges enable row level security;

-- Fix #5: Recreate get_nudge_candidates with search_path pinned
create or replace function get_nudge_candidates()
returns table (user_id uuid, first_item_url text)
language sql security definer
set search_path = ''
as $$
  select distinct on (ti.user_id)
    ti.user_id,
    ti.url as first_item_url
  from public.tracked_items ti
  where ti.created_at <= now() - interval '24 hours'
    and ti.user_id not in (select un.user_id from public.user_nudges un)
  order by ti.user_id, ti.created_at asc;
$$;
