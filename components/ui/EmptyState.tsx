import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import Card from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Short headline. */
  title?: string
  /** Supporting copy. */
  message: ReactNode
  /** Optional icon. Defaults to an inbox. */
  icon?: LucideIcon
  /** Optional call-to-action rendered below the copy. */
  action?: ReactNode
  className?: string
}

/**
 * Friendly placeholder shown when a list/grid has nothing to display. Replaces
 * the bare "no results" cards scattered across admin components.
 */
export default function EmptyState({
  title = 'Nothing here yet',
  message,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-lg border-[2.5px] border-ink bg-paper">
        <Icon className="h-5 w-5 text-ink-faint" aria-hidden="true" />
      </span>
      <div className="max-w-sm">
        <p className="font-display text-base uppercase text-ink">{title}</p>
        <p className="mt-1 text-sm font-medium text-ink-soft">{message}</p>
      </div>
      {action}
    </Card>
  )
}
