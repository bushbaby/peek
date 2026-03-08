'use client'

import { DownloadIcon, PuzzleIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

export function ExtensionPopover() {
  return (
    <Popover>
      <PopoverTrigger className="hidden sm:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-ghost hover:text-ink transition-colors cursor-pointer">
        <PuzzleIcon className="h-3.5 w-3.5" />
        Get extension
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-80 p-4 text-sm">
        <p className="font-semibold text-ink mb-1">Install the Peek extension</p>
        <p className="text-xs text-ink-muted mb-4">
          Chrome only. This is an unofficial build — Chrome will show a developer mode warning, that&apos;s expected.
        </p>

        <a
          href="/peek-extension.zip"
          download
          className="flex items-center justify-center gap-2 w-full rounded-md bg-ink text-canvas px-3 py-2 text-xs font-semibold hover:opacity-90 transition-opacity mb-4"
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
            <span>
              Open{' '}
              <code className="bg-ghost rounded px-1 text-ink font-mono">chrome://extensions</code>
            </span>
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
      </PopoverContent>
    </Popover>
  )
}
