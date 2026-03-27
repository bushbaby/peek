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

const DASHBOARD_URL = 'https://peek.bushbaby.dev'

function createTransport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
}

// ─── Change notification ──────────────────────────────────────────────────────

function buildChangeHtml(item: TrackedItem, snapshot: Snapshot): string {
  const hostname = new URL(item.url).hostname
  const detectedAt = formatDate(new Date())
  const snippet = snapshot.snippet?.trim() ?? ''

  const snippetBlock = snippet
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:16px;">
            <p style="margin:0 0 8px 0;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;">Content</p>
            <p style="margin:0;font-size:13px;color:#0F172A;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${escapeHtml(snippet)}</p>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 24px 4px;">
              <span style="font-size:15px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">Peek</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;padding:32px;">
              <p style="margin:0 0 24px 0;font-size:17px;font-weight:600;color:#0F172A;letter-spacing:-0.3px;">Something changed on ${escapeHtml(hostname)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                <tr><td style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;padding-bottom:6px;">Page</td></tr>
                <tr><td><a href="${item.url}" style="font-size:13px;color:#0F172A;word-break:break-all;text-decoration:none;border-bottom:1px solid #E2E8F0;">${escapeHtml(item.url)}</a></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                <tr>
                  <td width="55%" style="vertical-align:top;">
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;">Selector</p>
                    <p style="margin:0;font-size:12px;color:#475569;font-family:'SF Mono',Consolas,'Courier New',monospace;">${escapeHtml(item.selector)}</p>
                  </td>
                  <td width="45%" style="vertical-align:top;text-align:right;">
                    <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;">Detected</p>
                    <p style="margin:0;font-size:12px;color:#475569;">${escapeHtml(detectedAt)}</p>
                  </td>
                </tr>
              </table>
              ${snippetBlock}
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;">
                <tr>
                  <td>
                    <a href="${DASHBOARD_URL}" style="display:inline-block;background-color:#22C55E;color:#0B1220;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;letter-spacing:-0.1px;">Open dashboard →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 4px 0;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">You're receiving this because you're tracking ${escapeHtml(hostname)} with Peek.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildChangePlainText(item: TrackedItem, snapshot: Snapshot): string {
  const hostname = new URL(item.url).hostname
  const lines = [
    `Something changed on ${hostname}`,
    ``,
    item.url,
    `Selector: ${item.selector}`,
    `Detected: ${formatDate(new Date())}`,
  ]
  const snippet = snapshot.snippet?.trim()
  if (snippet) {
    lines.push(``, `Content:`, snippet)
  }
  lines.push(``, `Open dashboard: ${DASHBOARD_URL}`, ``, `—`, `Peek`)
  return lines.join('\n')
}

// ─── Error notification ───────────────────────────────────────────────────────

function buildErrorHtml(
  item: TrackedItem,
  status: 'selector_missing' | 'error',
  errorMessage: string,
): string {
  const hostname = new URL(item.url).hostname
  const detectedAt = formatDate(new Date())
  const isMissing = status === 'selector_missing'

  const heading = isMissing
    ? `Tracked element not found on ${escapeHtml(hostname)}`
    : `Couldn't check ${escapeHtml(hostname)}`

  const body = isMissing
    ? `The element <code style="font-family:'SF Mono',Consolas,'Courier New',monospace;font-size:12px;background-color:#F1F5F9;padding:1px 5px;border-radius:3px;">${escapeHtml(item.selector)}</code> was not found on the page. The page may have been restructured.`
    : `We ran into an error while checking this page. We'll try again at the next scheduled check.`

  const detailBlock = errorMessage
    ? `<p style="margin:16px 0 0 0;font-size:12px;color:#94A3B8;font-family:'SF Mono',Consolas,'Courier New',monospace;word-break:break-word;">${escapeHtml(errorMessage)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 24px 4px;">
              <span style="font-size:15px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">Peek</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;padding:32px;">
              <p style="margin:0 0 16px 0;font-size:17px;font-weight:600;color:#0F172A;letter-spacing:-0.3px;">${heading}</p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.6;">${body}</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
                <tr><td style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;padding-bottom:6px;">Page</td></tr>
                <tr><td><a href="${item.url}" style="font-size:13px;color:#0F172A;word-break:break-all;text-decoration:none;border-bottom:1px solid #E2E8F0;">${escapeHtml(item.url)}</a></td></tr>
              </table>
              <p style="margin:0 0 4px 0;font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;">Detected</p>
              <p style="margin:0;font-size:12px;color:#475569;">${escapeHtml(detectedAt)}</p>
              ${detailBlock}
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:24px;">
                <tr>
                  <td>
                    <a href="${DASHBOARD_URL}" style="display:inline-block;background-color:#22C55E;color:#0B1220;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;letter-spacing:-0.1px;">Open dashboard →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 4px 0;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">You're receiving this because you're tracking ${escapeHtml(hostname)} with Peek.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildErrorPlainText(
  item: TrackedItem,
  status: 'selector_missing' | 'error',
  errorMessage: string,
): string {
  const hostname = new URL(item.url).hostname
  const isMissing = status === 'selector_missing'
  const lines = [
    isMissing
      ? `Tracked element not found on ${hostname}`
      : `Couldn't check ${hostname}`,
    ``,
    isMissing
      ? `The element (${item.selector}) was not found on the page. It may have been restructured.`
      : `We ran into an error while checking this page. We'll try again at the next scheduled check.`,
    ``,
    item.url,
    `Selector: ${item.selector}`,
    `Detected: ${formatDate(new Date())}`,
  ]
  if (errorMessage) {
    lines.push(``, errorMessage)
  }
  lines.push(``, `Open dashboard: ${DASHBOARD_URL}`, ``, `—`, `Peek`)
  return lines.join('\n')
}

// ─── Nudge email ─────────────────────────────────────────────────────────────

type NudgeIcp = 'developer' | 'reliability' | 'restock'

const DEVELOPER_HOSTNAMES = new Set([
  'github.com',
  'gitlab.com',
  'npmjs.com',
  'pypi.org',
  'crates.io',
  'pkg.go.dev',
  'rubygems.org',
  'packagist.org',
  'hub.docker.com',
])

const GOV_TLD = /\.(gov|mil|gouv\.\w+|gov\.\w+|gc\.ca|europa\.eu)$/

function detectNudgeIcp(url: string): NudgeIcp {
  try {
    const { hostname, pathname } = new URL(url)
    if (DEVELOPER_HOSTNAMES.has(hostname) || hostname.endsWith('.github.io')) return 'developer'
    if (GOV_TLD.test(hostname)) return 'reliability'
    if (/procurement|tender|rfp|contract/i.test(pathname)) return 'reliability'
  } catch {
    // malformed URL — fall through to default
  }
  return 'restock'
}

const NUDGE_COPY: Record<NudgeIcp, { headline: string; body: string }> = {
  developer: {
    headline: 'Peek is watching for the next release',
    body: "We'll email you the moment that page changes — whether it's a new release, a version bump, or a status update. No script to maintain.",
  },
  reliability: {
    headline: 'Peek is watching that page for you',
    body: "We check every few hours and email you the moment anything changes. You won't miss it.",
  },
  restock: {
    headline: 'Peek is on it',
    body: "The moment that page changes — price drop, back in stock, whatever you're waiting for — you'll know.",
  },
}

function buildNudgeHtml(firstItemUrl: string): string {
  const icp = detectNudgeIcp(firstItemUrl)
  const { headline, body } = NUDGE_COPY[icp]

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 24px 4px;">
              <span style="font-size:15px;font-weight:700;color:#0F172A;letter-spacing:-0.3px;">Peek</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#FFFFFF;border-radius:10px;border:1px solid #E2E8F0;padding:32px;">
              <p style="margin:0 0 16px 0;font-size:17px;font-weight:600;color:#0F172A;letter-spacing:-0.3px;">${escapeHtml(headline)}</p>
              <p style="margin:0 0 24px 0;font-size:14px;color:#475569;line-height:1.6;">${escapeHtml(body)}</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                <tr><td style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;letter-spacing:0.6px;padding-bottom:6px;">Watching</td></tr>
                <tr><td><a href="${firstItemUrl}" style="font-size:13px;color:#0F172A;word-break:break-all;text-decoration:none;border-bottom:1px solid #E2E8F0;">${escapeHtml(firstItemUrl)}</a></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <a href="${DASHBOARD_URL}" style="display:inline-block;background-color:#22C55E;color:#0B1220;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;letter-spacing:-0.1px;">Open dashboard →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 4px 0;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">You're receiving this because you set up tracking with Peek.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildNudgePlainText(firstItemUrl: string): string {
  const icp = detectNudgeIcp(firstItemUrl)
  const { headline, body } = NUDGE_COPY[icp]
  return [
    headline,
    ``,
    body,
    ``,
    `Watching: ${firstItemUrl}`,
    ``,
    `Open dashboard: ${DASHBOARD_URL}`,
    ``,
    `—`,
    `Peek`,
  ].join('\n')
}

// ─── Public API ───────────────────────────────────────────────────────────────

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
  const hostname = new URL(item.url).hostname
  await createTransport(config).sendMail({
    from: config.from,
    to,
    subject: `[Peek] ${hostname} changed`,
    text: buildChangePlainText(item, snapshot),
    html: buildChangeHtml(item, snapshot),
  })
}

/**
 * Send a 24h onboarding nudge to a user who has set up their first tracked item.
 * ICP-aware copy is derived from the URL they chose to track.
 * Called from the GitHub Actions worker only.
 */
export async function sendNudgeEmail(
  config: SmtpConfig,
  to: string,
  firstItemUrl: string,
): Promise<void> {
  await createTransport(config).sendMail({
    from: config.from,
    to,
    subject: `[Peek] Your first item is being watched`,
    text: buildNudgePlainText(firstItemUrl),
    html: buildNudgeHtml(firstItemUrl),
  })
}

/**
 * Send a notification for selector_missing or a technical error.
 * Only called on status transition.
 */
export async function sendErrorNotification(
  config: SmtpConfig,
  to: string,
  item: TrackedItem,
  status: 'selector_missing' | 'error',
  errorMessage: string,
): Promise<void> {
  const hostname = new URL(item.url).hostname
  const subject =
    status === 'selector_missing'
      ? `[Peek] Element not found: ${hostname}`
      : `[Peek] Check failed: ${hostname}`

  await createTransport(config).sendMail({
    from: config.from,
    to,
    subject,
    text: buildErrorPlainText(item, status, errorMessage),
    html: buildErrorHtml(item, status, errorMessage),
  })
}
