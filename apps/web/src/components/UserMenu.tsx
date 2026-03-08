'use client'

import { useState, useEffect } from 'react'
import { DownloadIcon, SunIcon, MoonIcon, ChevronDownIcon, LogOutIcon, PuzzleIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'

const STORAGE_KEY = 'peek-theme'

function resolveTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface UserMenuProps {
  userEmail: string
}

export function UserMenu({ userEmail }: UserMenuProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  const [isChrome, setIsChrome] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [extensionOpen, setExtensionOpen] = useState(false)

  useEffect(() => {
    setTheme(resolveTheme())
    setIsChrome(/Chrome\//.test(navigator.userAgent) && !/Edg\//.test(navigator.userAgent))
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger className="flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-ghost transition-colors cursor-pointer">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-line text-[11px] font-semibold text-ink">
            {userEmail[0]?.toUpperCase() ?? '?'}
          </span>
          <span className="hidden sm:block max-w-35 truncate text-xs text-ink-soft">{userEmail}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-ink-muted" />
        </PopoverTrigger>

        <PopoverContent side="bottom" align="end" className="w-60 p-1 gap-0">
          {/* Email */}
          <div className="px-3 py-2">
            <p className="text-xs text-ink-muted truncate">{userEmail}</p>
          </div>

          <div className="border-t border-line-subtle my-1" />

          {/* Theme toggle */}
          {theme !== null && (
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-ink-soft hover:bg-ghost hover:text-ink transition-colors text-left"
            >
              {theme === 'dark'
                ? <SunIcon className="h-4 w-4 flex-none" />
                : <MoonIcon className="h-4 w-4 flex-none" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          )}

          {/* Extension (Chrome only) */}
          {isChrome && (
            <button
              onClick={() => { setMenuOpen(false); setExtensionOpen(true) }}
              className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-ink-soft hover:bg-ghost hover:text-ink transition-colors text-left"
            >
              <PuzzleIcon className="h-4 w-4 flex-none" />
              Get extension
            </button>
          )}

          <div className="border-t border-line-subtle my-1" />

          {/* Sign out */}
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-ink-soft hover:bg-ghost hover:text-ink transition-colors"
            >
              <LogOutIcon className="h-4 w-4 flex-none" />
              Sign out
            </button>
          </form>
        </PopoverContent>
      </Popover>

      {/* Extension install dialog */}
      <Dialog open={extensionOpen} onOpenChange={setExtensionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Install the Peek extension</DialogTitle>
            <DialogDescription>
              Chrome only. This is an unofficial build — Chrome will show a developer mode warning, that&apos;s expected.
            </DialogDescription>
          </DialogHeader>

          <a
            href="/peek-extension.zip"
            download
            className="flex items-center justify-center gap-2 w-full rounded-md bg-ink text-canvas px-3 py-2 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Download peek-extension.zip
          </a>

          <ol className="space-y-2 text-xs text-ink-soft list-none">
            <li className="flex gap-2.5">
              <span className="flex-none w-4 h-4 rounded-full bg-line text-ink text-[10px] font-bold flex items-center justify-center">1</span>
              <span>Unzip the downloaded file</span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex-none w-4 h-4 rounded-full bg-line text-ink text-[10px] font-bold flex items-center justify-center">2</span>
              <span>Open <code className="bg-ghost rounded px-1 text-ink font-mono">chrome://extensions</code></span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex-none w-4 h-4 rounded-full bg-line text-ink text-[10px] font-bold flex items-center justify-center">3</span>
              <span>Enable <strong>Developer mode</strong> (toggle, top-right)</span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex-none w-4 h-4 rounded-full bg-line text-ink text-[10px] font-bold flex items-center justify-center">4</span>
              <span>Click <strong>Load unpacked</strong> and select the <code className="bg-ghost rounded px-1 text-ink font-mono">dist</code> folder</span>
            </li>
          </ol>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  )
}
