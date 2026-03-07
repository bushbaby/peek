-- Enable Supabase Realtime for tracked_items so the dashboard
-- auto-updates when the worker writes new snapshot data.
alter publication supabase_realtime add table tracked_items;
