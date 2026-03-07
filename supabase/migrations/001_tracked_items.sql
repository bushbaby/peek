-- Peek: tracked_items table
-- Run this in the Supabase SQL editor or via the Supabase CLI

create table if not exists tracked_items (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  url                   text not null,
  selector              text not null,
  last_snapshot_hash    text,
  last_snapshot_snippet text,
  last_checked_at       timestamptz,
  last_changed_at       timestamptz,
  last_status           text check (last_status in ('ok', 'changed', 'error', 'selector_missing')),
  last_error_message    text,
  is_paused             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Row Level Security: users can only access their own rows
alter table tracked_items enable row level security;

create policy "Users can manage their own tracked items"
  on tracked_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on any row change
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tracked_items_updated_at
  before update on tracked_items
  for each row execute function update_updated_at_column();
