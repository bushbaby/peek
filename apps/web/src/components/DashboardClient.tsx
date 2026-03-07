'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TrackedItem } from '@peek/db'
import { createClient } from '@/lib/supabase/client'
import { TrackedItemRow } from './TrackedItemRow'
import { AddEditModal } from './AddEditModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { ThemeToggle } from './ThemeToggle'
import { Button } from './ui/button'

interface DashboardClientProps {
  items: TrackedItem[]
  userEmail: string
  userId: string
}

type ModalState =
  | { type: 'add' }
  | { type: 'edit'; item: TrackedItem }
  | { type: 'delete'; item: TrackedItem }
  | { type: 'checkResult'; id: string; result: string }
  | null

const IS_DEV = process.env.NODE_ENV !== 'production'

export function DashboardClient({ items, userEmail, userId }: DashboardClientProps) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>(null)
  const [checkResults, setCheckResults] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tracked_items_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tracked_items', filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, router])

  function handleCheckNow(id: string) {
    // Set 'checking…' as an urgent update (outside startTransition) so the
    // spinner renders immediately before the async fetch begins.
    setCheckResults((prev) => ({ ...prev, [id]: 'checking…' }))
    void fetch(`/api/dev/check/${id}?email=true`, { method: 'POST' })
      .then((res) => res.json())
      .then((json) => {
        setCheckResults((prev) => ({ ...prev, [id]: json.status ?? (json.error || 'error') }))
      })
      .catch(() => {
        setCheckResults((prev) => ({ ...prev, [id]: 'error' }))
      })
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-line bg-surface px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Peek</h1>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-muted sm:block">{userEmail}</span>
            <ThemeToggle />
            <form action="/auth/signout" method="POST">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-soft">
            {items.length} {items.length === 1 ? 'item' : 'items'} tracked
          </h2>
          <Button onClick={() => setModal({ type: 'add' })}>
            + Add item
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-form bg-surface px-6 py-16 text-center">
            <p className="text-sm text-ink-muted mb-4">No tracked items yet.</p>
            <Button onClick={() => setModal({ type: 'add' })}>
              + Add your first item
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-line-subtle text-xs font-medium text-ink-muted uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">URL / Selector</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden sm:table-cell px-4 py-3">Last checked</th>
                  <th className="hidden md:table-cell px-4 py-3">Last changed</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <TrackedItemRow
                    key={item.id}
                    item={item}
                    isDev={IS_DEV}
                    isChecking={checkResults[item.id] === 'checking…'}
                    onEdit={(i) => setModal({ type: 'edit', item: i })}
                    onDelete={(i) => setModal({ type: 'delete', item: i })}
                    onCheckNow={IS_DEV ? handleCheckNow : undefined}
                  />
                ))}
              </tbody>
            </table>

            {/* Dev check results */}
            {IS_DEV && Object.keys(checkResults).length > 0 && (
              <div className="border-t border-line-subtle px-4 py-3">
                <p className="text-xs font-medium text-blue-600 mb-1 dark:text-blue-400">
                  Dev check results:
                </p>
                {Object.entries(checkResults).map(([id, result]) => {
                  const item = items.find((i) => i.id === id)
                  return (
                    <p key={id} className="text-xs text-ink-muted">
                      <span className="font-mono">{item?.url ?? id}</span>: {result}
                    </p>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {modal?.type === 'add' && (
        <AddEditModal onClose={() => setModal(null)} />
      )}
      {modal?.type === 'edit' && (
        <AddEditModal item={modal.item} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'delete' && (
        <DeleteConfirmDialog
          id={modal.item.id}
          url={modal.item.url}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
