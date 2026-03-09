'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TrackedItem } from '@peek/db'
import { createClient } from '@/lib/supabase/client'
import { TrackedItemRow } from './TrackedItemRow'
import { AddEditModal } from './AddEditModal'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { Button } from './ui/button'
import { UserMenu } from './UserMenu'
import Image from 'next/image'

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, router])

  function handleCheckNow(id: string) {
    // Set 'checking…' as an urgent update (outside startTransition) so the
    // spinner renders immediately before the async fetch begins.
    setCheckResults((prev) => ({ ...prev, [id]: 'checking…' }))
    void fetch(`/api/dev/check/${id}?email=true`, { method: 'POST' })
      .then((res) => res.json())
      .then((json) => {
        const display =
          json.status === 'error' || json.status === 'selector_missing'
            ? `${json.status}: ${json.error ?? '?'}`
            : (json.status ?? json.error ?? 'error')
        setCheckResults((prev) => ({ ...prev, [id]: display }))
      })
      .catch(() => {
        setCheckResults((prev) => ({ ...prev, [id]: 'error' }))
      })
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-line bg-surface/80 pr-4 py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Peek logo" width={28} height={28} className="dark:invert" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Peek</h1>
              <p className="text-xs text-ink-muted">Track selectors • Email alerts</p>
            </div>
          </div>
          <UserMenu userEmail={userEmail} />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Tracked items</h2>
            <p className="text-sm text-ink-muted">
              {items.length} {items.length === 1 ? 'item' : 'items'} watching selectors
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setModal({ type: 'add' })}>+ Add item</Button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-form bg-surface px-6 py-16 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <p className="text-base font-semibold text-ink">No tracked items yet</p>
            <p className="text-sm text-ink-muted mb-5">
              Add a URL and selector to start monitoring changes.
            </p>
            <Button onClick={() => setModal({ type: 'add' })}>+ Add your first item</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_80px_rgba(0,0,0,0.2)]">
            <table className="w-full text-left">
              <thead className="border-b border-line-subtle bg-ghost/40 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                <tr>
                  <th className="px-4 py-3">URL / Selector</th>
                  <th className="px-4 py-3">Status / Snapshot</th>
                  <th className="hidden sm:table-cell px-4 py-3">Last checked</th>
                  <th className="hidden md:table-cell px-4 py-3">Last changed</th>
                  <th className="px-4 py-3 text-right">Actions</th>
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
              <div className="border-t border-line-subtle bg-ghost/30 px-4 py-3">
                <p className="mb-1 text-xs font-semibold text-blue-400">Dev check results</p>
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
      {modal?.type === 'add' && <AddEditModal onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <AddEditModal item={modal.item} onClose={() => setModal(null)} />}
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
