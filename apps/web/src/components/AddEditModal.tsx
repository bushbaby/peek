'use client'

import { useTransition, useState, useEffect, useRef } from 'react'
import type { TrackedItem } from '@peek/db'
import { addTrackedItemAction, updateTrackedItemAction } from '@/app/dashboard/actions'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'

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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit tracked item' : 'Add tracked item'}</DialogTitle>
        </DialogHeader>

        <form id="tracked-item-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="url">URL</Label>
            <Input
              ref={urlRef}
              id="url"
              name="url"
              type="url"
              required
              defaultValue={item?.url}
              placeholder="https://example.com/page"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="selector">Selector</Label>
            <Input
              id="selector"
              name="selector"
              type="text"
              required
              defaultValue={item?.selector}
              placeholder='#price or [data-testid="stock"]'
            />
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                We render the page (JS-enabled) and extract this selector. Prefer stable IDs or{' '}
                <code className="font-mono">[data-testid]</code>.
              </p>
              <p>
                Examples: <code className="font-mono">#price</code>,{' '}
                <code className="font-mono">[data-testid=&quot;stock&quot;]</code>,{' '}
                <code className="font-mono">text=In stock</code>,{' '}
                <code className="font-mono">xpath=//span[@class=&quot;price&quot;]</code>.
              </p>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="tracked-item-form" disabled={isPending}>
            {isPending ? 'Saving…' : item ? 'Save changes' : 'Add item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
