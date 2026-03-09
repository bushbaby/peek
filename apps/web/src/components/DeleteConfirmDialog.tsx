'use client'

import { useTransition, useState } from 'react'
import { deleteTrackedItemAction } from '@/app/dashboard/actions'
import { Button } from './ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from './ui/alert-dialog'

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
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove tracked item?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the tracked item and its snapshot data. Emails will stop
            for this URL.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-sm font-medium truncate">{url}</p>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? 'Removing…' : 'Remove'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
