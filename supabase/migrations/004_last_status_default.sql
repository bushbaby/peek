-- Make last_status non-nullable with a default of 'new'
alter table tracked_items
  drop constraint if exists tracked_items_last_status_check;

update tracked_items
  set last_status = 'new'
  where last_status is null;

alter table tracked_items
  alter column last_status set not null,
  alter column last_status set default 'new',
  add constraint tracked_items_last_status_check
    check (last_status in ('new', 'ok', 'changed', 'error', 'selector_missing'));
