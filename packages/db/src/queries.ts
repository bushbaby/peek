import type { SupabaseClient } from '@supabase/supabase-js'
import type { TrackedItem, SnapshotUpdate } from './types'

// --- UI queries (all items for a user, respects RLS) ---

export async function getAllTrackedItems(client: SupabaseClient): Promise<TrackedItem[]> {
  const { data, error } = await client
    .from('tracked_items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTrackedItemById(client: SupabaseClient, id: string): Promise<TrackedItem> {
  const { data, error } = await client.from('tracked_items').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function insertTrackedItem(
  client: SupabaseClient,
  data: { url: string; selector: string; user_id: string },
): Promise<TrackedItem> {
  const { data: item, error } = await client.from('tracked_items').insert(data).select().single()
  if (error) throw error
  return item
}

export async function updateTrackedItem(
  client: SupabaseClient,
  id: string,
  data: { url?: string; selector?: string },
): Promise<TrackedItem> {
  const { data: item, error } = await client
    .from('tracked_items')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return item
}

export async function deleteTrackedItem(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('tracked_items').delete().eq('id', id)
  if (error) throw error
}

export async function setPaused(
  client: SupabaseClient,
  id: string,
  isPaused: boolean,
): Promise<void> {
  const { error } = await client.from('tracked_items').update({ is_paused: isPaused }).eq('id', id)
  if (error) throw error
}

// --- Worker queries (all non-paused items, bypasses RLS via service role) ---

export async function getTrackedItems(client: SupabaseClient): Promise<TrackedItem[]> {
  const { data, error } = await client
    .from('tracked_items')
    .select('*')
    .eq('is_paused', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function updateSnapshot(
  client: SupabaseClient,
  id: string,
  data: SnapshotUpdate,
): Promise<void> {
  const { error } = await client.from('tracked_items').update(data).eq('id', id)
  if (error) throw error
}

export async function getUserEmail(client: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await client.auth.admin.getUserById(userId)
  if (error) throw error
  const email = data.user?.email
  if (!email) throw new Error(`No email found for user ${userId}`)
  return email
}
