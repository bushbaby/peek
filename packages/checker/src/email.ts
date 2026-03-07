import nodemailer from 'nodemailer'
import type { TrackedItem } from '@peek/db'
import type { Snapshot } from './snapshot'

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

/**
 * Send an email notification when a tracked item's content has changed.
 * Called from the GitHub Actions worker only.
 */
export async function sendNotification(
  config: SmtpConfig,
  to: string,
  item: TrackedItem,
  snapshot: Snapshot,
  previousHash: string | null,
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  })

  const hostname = new URL(item.url).hostname
  const subject = `[Peek] Change detected: ${hostname}`

  const text = [
    `A change was detected on a tracked page.`,
    ``,
    `URL:      ${item.url}`,
    `Selector: ${item.selector}`,
    `Detected: ${new Date().toUTCString()}`,
    ``,
    `Previous hash: ${previousHash ?? '(none — first check)'}`,
    `New hash:      ${snapshot.hash}`,
    ``,
    `Content snippet:`,
    snapshot.snippet || '(empty)',
    ``,
    `---`,
    `Managed at https://peek.bushbaby.dev`,
  ].join('\n')

  await transport.sendMail({ from: config.from, to, subject, text })
}

/**
 * Send a notification for selector_missing (treated as a change event) or a
 * technical error (network failure, etc.). Only called on status transition.
 */
export async function sendErrorNotification(
  config: SmtpConfig,
  to: string,
  item: TrackedItem,
  status: 'selector_missing' | 'error',
  errorMessage: string,
): Promise<void> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  })

  const hostname = new URL(item.url).hostname

  const subject =
    status === 'selector_missing'
      ? `[Peek] Content no longer detected: ${hostname}`
      : `[Peek] Check error: ${hostname}`

  const text = [
    status === 'selector_missing'
      ? `The tracked element is no longer found on the page — it may have been removed or the page structure changed.`
      : `An error occurred while checking the tracked page.`,
    ``,
    `URL:      ${item.url}`,
    `Selector: ${item.selector}`,
    `Detected: ${new Date().toUTCString()}`,
    ``,
    status === 'selector_missing' ? `Detail: ${errorMessage}` : `Error: ${errorMessage}`,
    ``,
    `---`,
    `Managed at https://peek.bushbaby.dev`,
  ].join('\n')

  await transport.sendMail({ from: config.from, to, subject, text })
}
