'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

type Status = 'connecting' | 'done' | 'error'

export default function ExtensionCallbackPage() {
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    async function relay() {
      const supabase = createClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        setStatus('error')
        return
      }

      window.postMessage(
        {
          type: 'PEEK_TOKEN',
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        },
        window.location.origin,
      )

      setStatus('done')
      // Give the content script a moment to receive the message before closing
      setTimeout(() => window.close(), 500)
    }

    void relay()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
        <div className="flex items-end gap-3 px-3 py-2">
          <Image
            src="/logo.svg"
            alt="Peek logo"
            width={32}
            height={32}
            className="dark:invert"
            priority
          />
          <span className="text-sm font-semibold tracking-tight text-ink-soft">Peek</span>
        </div>

        {status === 'connecting' && (
          <p className="text-sm text-ink-muted">Connecting to Peek extension…</p>
        )}

        {status === 'done' && (
          <p className="text-sm text-ink-muted">Connected. This tab will close shortly.</p>
        )}

        {status === 'error' && (
          <>
            <div className="space-y-2">
              <h1 className="text-base font-semibold text-ink">Sign in to connect the extension</h1>
              <p className="text-sm text-ink-muted">
                You need to be signed in to Peek before the extension can connect.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-ink text-canvas px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in to Peek
            </Link>
            <p className="text-xs text-ink-muted">
              After signing in, click <strong>Connect Peek extension</strong> in the extension popup
              again.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
