import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ThemeToggle'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <main className="relative min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center px-4 py-16">
        <div className="mb-32 flex w-full items-center justify-between">
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
          <ThemeToggle />
        </div>

        <div className="relative w-full overflow-hidden rounded-3xl bg-surface px-6 py-10 shadow-[0_20px_80px_rgba(0,0,0,0.35)] ring-1 ring-line">
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl"
            aria-hidden
          />

          <div className="relative flex flex-col gap-8">
            <header className="max-w-2xl space-y-3 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Change monitoring for the web
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                Watch the exact parts of a page that matter.
              </h1>
              <p className="text-base text-ink-soft">
                Add a URL and a CSS selector. We render JS, detect content changes, and email you
                when something shifts.
              </p>
              <p className="text-sm text-ink-muted">
                Private by default. No teams, just your alerts.
              </p>
            </header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <form action="/auth/signin/github" method="POST" className="w-full sm:w-auto">
                <Button type="submit" className="w-full sm:w-auto px-5 py-3 text-sm font-semibold">
                  <GitHubIcon />
                  Sign in with GitHub
                </Button>
              </form>
              <form action="/auth/signin/google" method="POST" className="w-full sm:w-auto">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full sm:w-auto px-5 py-3 text-sm font-semibold border-line text-ink hover:bg-ghost"
                >
                  <GoogleIcon />
                  Continue with Google
                </Button>
              </form>
              <div className="text-xs text-ink-muted sm:ml-2">
                Free, personal use. Email alerts only.
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                'JS-enabled rendering to catch SPA changes',
                'Target precise selectors, not whole pages',
                'Email notifications with change snippets',
              ].map((copy) => (
                <div
                  key={copy}
                  className="flex items-start gap-2 rounded-lg bg-ghost/60 px-3 py-3 ring-1 ring-line-subtle"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
                  <p className="text-sm text-ink-soft leading-snug">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
