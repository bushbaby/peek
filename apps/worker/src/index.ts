import {
  createServiceRoleClient,
  getTrackedItems,
  updateSnapshot,
  getUserEmail,
} from '@peek/db'
import { fetchPage, computeSnapshot, hasChanged, sendNotification } from '@peek/checker'
import type { SmtpConfig } from '@peek/checker'

function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('Missing SMTP_HOST, SMTP_USER, or SMTP_PASS environment variables')
  }

  return { host, port, user, pass, from: 'Peek <peeked@bushbaby.dev>' }
}

async function main() {
  console.log(`[worker] Starting check run at ${new Date().toISOString()}`)

  const supabase = createServiceRoleClient()
  const smtpConfig = getSmtpConfig()

  const items = await getTrackedItems(supabase)
  console.log(`[worker] Processing ${items.length} non-paused items`)

  for (const item of items) {
    console.log(`[worker] Checking item ${item.id}: ${item.url} [${item.selector}]`)

    try {
      const result = await fetchPage(item.url, item.selector)

      if ('error' in result) {
        const status = result.error === 'selector_missing' ? 'selector_missing' : 'error'
        await updateSnapshot(supabase, item.id, {
          last_status: status,
          last_error_message: result.error,
          last_checked_at: new Date().toISOString(),
        })
        console.warn(`[worker] Error for item ${item.id}: ${result.error}`)
        continue
      }

      const snapshot = computeSnapshot(result.html)
      const changed = hasChanged(item.last_snapshot_hash, snapshot.hash)

      if (changed) {
        console.log(`[worker] Change detected for item ${item.id}`)
        try {
          const email = await getUserEmail(supabase, item.user_id)
          await sendNotification(smtpConfig, email, item, snapshot, item.last_snapshot_hash)
          console.log(`[worker] Notification sent to ${email}`)
        } catch (emailErr) {
          console.error(`[worker] Failed to send email for item ${item.id}:`, emailErr)
          // Don't bail — still update the snapshot
        }
      } else {
        console.log(`[worker] No change for item ${item.id}`)
      }

      await updateSnapshot(supabase, item.id, {
        last_snapshot_hash: changed ? snapshot.hash : item.last_snapshot_hash,
        last_snapshot_snippet: changed ? snapshot.snippet : item.last_snapshot_snippet,
        last_status: changed ? 'changed' : 'ok',
        last_error_message: null,
        last_checked_at: new Date().toISOString(),
        last_changed_at: changed ? new Date().toISOString() : item.last_changed_at,
      })
    } catch (err) {
      console.error(`[worker] Unexpected error processing item ${item.id}:`, err)
      try {
        await updateSnapshot(supabase, item.id, {
          last_status: 'error',
          last_error_message: err instanceof Error ? err.message : 'Unknown error',
          last_checked_at: new Date().toISOString(),
        })
      } catch (updateErr) {
        console.error(`[worker] Failed to update error status for item ${item.id}:`, updateErr)
      }
    }
  }

  console.log(`[worker] Check run complete at ${new Date().toISOString()}`)
}

main().catch((err) => {
  console.error('[worker] Fatal error:', err)
  process.exit(1)
})
