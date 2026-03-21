export type CheckStatus = 'new' | 'ok' | 'changed' | 'error' | 'selector_missing'

export interface TrackedItem {
  id: string
  user_id: string
  url: string
  selector: string
  last_snapshot_hash: string | null
  last_snapshot_snippet: string | null
  last_checked_at: string | null
  last_changed_at: string | null
  last_status: CheckStatus
  last_error_message: string | null
  is_paused: boolean
  created_at: string
  updated_at: string
}

export interface SnapshotUpdate {
  last_snapshot_hash?: string | null
  last_snapshot_snippet?: string | null
  last_status?: CheckStatus
  last_error_message?: string | null
  last_checked_at?: string
  last_changed_at?: string | null
}
