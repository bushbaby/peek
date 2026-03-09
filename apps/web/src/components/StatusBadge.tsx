import type { CheckStatus } from '@peek/db'
import { Badge } from './ui/badge'

const CONFIG: Record<
  NonNullable<CheckStatus>,
  { label: string; className: string; dot: string }
> = {
  ok: {
    label: 'No change',
    className:
      'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-100 dark:ring-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  changed: {
    label: 'Changed',
    className:
      'bg-blue-100 text-blue-900 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-100 dark:ring-blue-500/30',
    dot: 'bg-blue-500',
  },
  error: {
    label: 'Error',
    className:
      'bg-red-100 text-red-900 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-100 dark:ring-red-500/30',
    dot: 'bg-red-500',
  },
  selector_missing: {
    label: 'Selector missing',
    className:
      'bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-500/30',
    dot: 'bg-amber-500',
  },
}

export function StatusBadge({ status }: { status: CheckStatus | null }) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">Not checked</span>
  }
  const { label, className, dot } = CONFIG[status]
  return (
    <Badge className={className}>
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
      {label}
    </Badge>
  )
}
