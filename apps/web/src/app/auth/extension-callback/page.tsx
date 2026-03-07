'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'connecting' | 'done' | 'error'

export default function ExtensionCallbackPage() {
  const [status, setStatus] = useState<Status>('connecting')

  useEffect(() => {
    async function relay() {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

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
    <main className="min-h-screen flex items-center justify-center bg-canvas text-ink">
      {status === 'connecting' && (
        <p className="text-sm text-ink-muted">Connecting to Peek extension…</p>
      )}
      {status === 'done' && (
        <p className="text-sm text-ink-muted">Connected. This tab will close shortly.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-500">
          Authentication failed. Please close this tab and try again.
        </p>
      )}
    </main>
  )
}
