import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient, getTrackedItemById, getUserEmail, updateSnapshot } from '@peek/db'
import { fetchPage, computeSnapshot, hasChanged, sendNotification } from '@peek/checker'

// This route is intentionally excluded from production use.
// It exists solely for local development testing of the checker pipeline.
// Add ?email=true to also send the notification email (tests SMTP config).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const sendEmail = new URL(request.url).searchParams.get('email') === 'true'
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let item
  try {
    item = await getTrackedItemById(supabase, id)
  } catch {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const result = await fetchPage(item.url, item.selector, { headed: true })

  if ('error' in result) {
    const status = result.error === 'selector_missing' ? 'selector_missing' : 'error'
    await updateSnapshot(supabase, id, {
      last_status: status,
      last_error_message: result.error,
      last_checked_at: new Date().toISOString(),
    })
    return NextResponse.json({ status, error: result.error })
  }

  const snapshot = computeSnapshot(result.html)
  const changed = hasChanged(item.last_snapshot_hash, snapshot.hash)

  await updateSnapshot(supabase, id, {
    last_snapshot_hash: snapshot.hash,
    last_snapshot_snippet: snapshot.snippet,
    last_status: changed ? 'changed' : 'ok',
    last_error_message: null,
    last_checked_at: new Date().toISOString(),
    last_changed_at: changed ? new Date().toISOString() : item.last_changed_at,
  })

  let emailSent = false
  if (sendEmail && changed) {
    const adminClient = createServiceRoleClient()
    const to = await getUserEmail(adminClient, user.id)
    await sendNotification(
      {
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT ?? 465),
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
        from: 'peeked@bushbaby.dev',
      },
      to,
      item,
      snapshot,
      item.last_snapshot_hash,
    )
    emailSent = true
  }

  return NextResponse.json({
    status: changed ? 'changed' : 'ok',
    method: result.method,
    hash: snapshot.hash,
    snippet: snapshot.snippet,
    ...(sendEmail && { emailSent }),
  })
}
