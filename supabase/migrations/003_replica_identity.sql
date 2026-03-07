-- Required for Supabase Realtime postgres_changes to filter UPDATE events
-- by non-primary-key columns (e.g. user_id=eq.${userId}).
-- Without this, only changed columns + PK are in the WAL, so the filter
-- never matches and the dashboard doesn't auto-refresh after worker runs.
alter table tracked_items replica identity full;
