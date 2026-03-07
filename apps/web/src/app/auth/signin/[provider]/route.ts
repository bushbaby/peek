import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Provider } from '@supabase/supabase-js'

const ALLOWED_PROVIDERS: Provider[] = ['github', 'google']

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params

  if (!ALLOWED_PROVIDERS.includes(provider as Provider)) {
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url), { status: 302 })
  }

  const origin = new URL(request.url).origin
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(new URL('/?error=oauth_failed', request.url), { status: 302 })
  }

  // 302 converts POST → GET so the browser uses GET when following the redirect
  // to Supabase's /authorize endpoint (307 would preserve POST, causing 405)
  return NextResponse.redirect(data.url, { status: 302 })
}
