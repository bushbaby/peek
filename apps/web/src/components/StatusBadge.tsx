import type { CheckStatus } from '@peek/db'

const CONFIG: Record<
  NonNullable<CheckStatus>,
  { label: string; className: string }
> = {
  ok: { label: 'No change', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  changed: { label: 'Changed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  selector_missing: { label: 'Selector missing', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
}

export function StatusBadge({ status }: { status: CheckStatus | null }) {
  if (!status) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">Not checked</span>
  }
  const { label, className } = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}
