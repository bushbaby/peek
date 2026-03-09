'use client'

import { useTransition } from 'react'
import type { TrackedItem } from '@peek/db'
import { StatusBadge } from './StatusBadge'
import { togglePauseAction } from '@/app/dashboard/actions'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'

interface TrackedItemRowProps {
  item: TrackedItem
  isDev: boolean
  isChecking?: boolean
  onEdit: (item: TrackedItem) => void
  onDelete: (item: TrackedItem) => void
  onCheckNow?: (id: string) => void
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '…'
}

export function TrackedItemRow({
  item,
  isDev,
  isChecking = false,
  onEdit,
  onDelete,
  onCheckNow,
}: TrackedItemRowProps) {
  const [isPendingPause, startPause] = useTransition()

  function handlePauseToggle() {
    startPause(() => togglePauseAction(item.id, !item.is_paused))
  }

  return (
    <tr
      className={`border-b border-line-subtle transition-colors duration-150 hover:bg-ghost/50 ${item.is_paused ? 'opacity-60' : ''}`}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-ink hover:underline truncate max-w-xs"
            title={item.url}
          >
            {truncate(item.url, 60)}
          </a>
          <code className="text-xs text-ink-muted truncate max-w-xs" title={item.selector}>
            {item.selector}
          </code>
        </div>
      </td>

      <td className="px-4 py-3">
        <StatusBadge status={item.last_status} />
        {item.last_error_message && item.last_status === 'error' && (
          <p
            className="mt-0.5 text-xs text-red-600 truncate max-w-40 dark:text-red-400"
            title={item.last_error_message}
          >
            {truncate(item.last_error_message, 50)}
          </p>
        )}
        {item.last_snapshot_snippet && item.last_status !== 'error' && (
          <Popover>
            <PopoverTrigger className="mt-1 inline-flex max-w-52 items-start gap-1 text-xs font-medium text-ink-faint underline decoration-dotted underline-offset-4 hover:text-ink-soft transition-colors clamp-1 text-left">
              {item.last_snapshot_snippet}
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="w-80 text-xs text-ink-soft leading-relaxed wrap-break-word"
            >
              {item.last_snapshot_snippet}
            </PopoverContent>
          </Popover>
        )}
      </td>

      <td className="hidden sm:table-cell px-4 py-3 text-xs text-ink-muted">
        {formatDate(item.last_checked_at)}
      </td>

      <td className="hidden md:table-cell px-4 py-3 text-xs text-ink-muted">
        {formatDate(item.last_changed_at)}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          {/* Pause/Resume */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handlePauseToggle}
            disabled={isPendingPause}
            title={item.is_paused ? 'Resume' : 'Pause'}
            aria-label={item.is_paused ? 'Resume' : 'Pause'}
            className="text-ink-faint hover:text-ink-soft"
          >
            {item.is_paused ? <PlayIcon /> : <PauseIcon />}
          </Button>

          {/* Edit */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(item)}
            title="Edit"
            aria-label="Edit"
            className="text-ink-faint hover:text-ink-soft"
          >
            <EditIcon />
          </Button>

          {/* Delete */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(item)}
            title="Remove"
            aria-label="Remove"
            className="text-ink-faint hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
          >
            <TrashIcon />
          </Button>

          {/* Check now — local dev only */}
          {isDev && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onCheckNow?.(item.id)}
              disabled={isChecking}
              title="Check now (dev)"
              aria-label="Check now (dev)"
              className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/20"
            >
              <RefreshIcon spinning={isChecking} />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function PauseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <div className={spinning ? 'animate-spin' : undefined}>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </div>
  )
}
