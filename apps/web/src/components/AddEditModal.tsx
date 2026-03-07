'use client'

import { useTransition, useState, useEffect, useRef } from 'react'
import type { TrackedItem } from '@peek/db'
import { addTrackedItemAction, updateTrackedItemAction } from '@/app/dashboard/actions'

interface AddEditModalProps {
  item?: TrackedItem
  onClose: () => void
}

export function AddEditModal({ item, onClose }: AddEditModalProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    urlRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        if (item) {
          await updateTrackedItemAction(item.id, formData)
        } else {
          await addTrackedItemAction(formData)
        }
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold">
            {item ? 'Edit tracked item' : 'Add tracked item'}
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer rounded p-1 text-ink-faint hover:text-ink-soft transition-colors duration-150"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-ink-soft mb-1">
              URL
            </label>
            <input
              ref={urlRef}
              id="url"
              name="url"
              type="url"
              required
              defaultValue={item?.url}
              placeholder="https://example.com/page"
              className="w-full rounded-lg border border-line-form bg-field px-3 py-2 text-sm text-ink placeholder-ink-faint focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
            />
          </div>

          <div>
            <label htmlFor="selector" className="block text-sm font-medium text-ink-soft mb-1">
              Selector
            </label>
            <input
              id="selector"
              name="selector"
              type="text"
              required
              defaultValue={item?.selector}
              placeholder="#price or [data-testid=&quot;stock&quot;] or xpath=//span[@itemprop=&quot;price&quot;]"
              className="w-full rounded-lg border border-line-form bg-field px-3 py-2 text-sm text-ink placeholder-ink-faint focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
            />
            <p className="mt-1 text-xs text-ink-muted">
              CSS (default), <code className="font-mono">xpath=//span[@class=&quot;price&quot;]</code>, or <code className="font-mono">text=In stock</code>.{' '}
              Prefer <code className="font-mono">#id</code> or <code className="font-mono">[data-testid=&quot;…&quot;]</code> for most reliable tracking.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-line-form px-4 py-2 text-sm font-medium text-ink-soft hover:bg-ghost transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-lg bg-cta px-4 py-2 text-sm font-medium text-white hover:bg-cta-hover disabled:opacity-50 transition-colors duration-150"
            >
              {isPending ? 'Saving…' : item ? 'Save changes' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
