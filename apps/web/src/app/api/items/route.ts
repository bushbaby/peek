import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { insertTrackedItem } from '@peek/db'
import { validateUrl } from '@peek/checker'

export async function POST(request: Request) {
  // Validate auth token from Authorization header (used by the browser extension)
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return NextResponse.json(
      { error: 'Missing authorization token' },
      { status: 401, headers: corsHeaders() },
    )
  }

  // Build a Supabase client that uses the token directly (not cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      cookies: { getAll: () => [], setAll: () => {} },
    },
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401, headers: corsHeaders() },
    )
  }

  // Per-user rate limiting: max 10 requests per 60 seconds
  const { count } = await supabase
    .from('tracked_items')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 60_000).toISOString())
  if ((count ?? 0) >= 10) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...corsHeaders(), 'Retry-After': '60' } },
    )
  }

  // Parse and validate body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders() },
    )
  }

  const { url, selector } = body as Record<string, unknown>

  if (typeof url !== 'string' || !url.trim()) {
    return NextResponse.json(
      { error: 'url is required', field: 'url' },
      { status: 422, headers: corsHeaders() },
    )
  }
  if (typeof selector !== 'string' || !selector.trim()) {
    return NextResponse.json(
      { error: 'selector is required', field: 'selector' },
      { status: 422, headers: corsHeaders() },
    )
  }

  try {
    await validateUrl(url.trim())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid URL', field: 'url' },
      { status: 422, headers: corsHeaders() },
    )
  }

  try {
    const item = await insertTrackedItem(supabase, {
      url: url.trim(),
      selector: selector.trim(),
      user_id: user.id,
    })
    return NextResponse.json(item, { status: 201, headers: corsHeaders() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create item' },
      { status: 500, headers: corsHeaders() },
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
