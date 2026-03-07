'use client'

import { useTransition, useState } from 'react'
import { deleteTrackedItemAction } from '@/app/dashboard/actions'

interface DeleteConfirmDialogProps {
  id: string
  url: string
  onClose: () => void
}

export function DeleteConfirmDialog({ id, url, onClose }: DeleteConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleDelete() {
    setError(undefined)
    startTransition(async () => {
      try {
        await deleteTrackedItemAction(id)
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete item')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-xl bg-surface shadow-xl p-6">
        <h2 className="text-base font-semibold mb-2">Remove tracked item?</h2>
        <p className="text-sm text-ink-muted mb-1">
          This will permanently delete the tracked item and its snapshot data.
        </p>
        <p className="text-sm font-medium text-ink truncate mb-5">{url}</p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-line-form px-4 py-2 text-sm font-medium text-ink-soft hover:bg-ghost transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors duration-150 dark:bg-red-700 dark:hover:bg-red-600"
          >
            {isPending ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  )
}
