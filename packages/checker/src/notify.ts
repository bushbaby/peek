import type { CheckStatus } from '@peek/db'
import { hasChanged } from './snapshot'

export type NotificationKind =
  | { kind: 'none' }
  | { kind: 'error'; status: 'selector_missing' | 'error'; message: string }
  | { kind: 'changed' }

/**
 * Pure decision function: given the item's previous state and the latest
 * check result, returns what notification (if any) should be sent.
 *
 * Inputs:
 *   lastStatus  - the item's current last_status (null = never checked)
 *   lastHash    - the item's current last_snapshot_hash (null = no baseline)
 *   result      - either an error result or a successful fetch with newHash
 */
export function decideNotification(
  lastStatus: CheckStatus | null,
  lastHash: string | null,
  result: { error: string } | { newHash: string },
): NotificationKind {
  if ('error' in result) {
    const status = result.error === 'selector_missing' ? 'selector_missing' : 'error'

    if (status === 'selector_missing') {
      // Only notify when selector disappears from a "found" state
      const wasFound = lastStatus === 'ok' || lastStatus === 'changed'
      return wasFound ? { kind: 'error', status, message: result.error } : { kind: 'none' }
    }

    // Technical error: notify on first occurrence only
    return lastStatus !== 'error'
      ? { kind: 'error', status, message: result.error }
      : { kind: 'none' }
  }

  // Success: selector came back after being missing, or content changed
  const selectorCameBack = lastStatus === 'selector_missing'
  return selectorCameBack || hasChanged(lastHash, result.newHash)
    ? { kind: 'changed' }
    : { kind: 'none' }
}
