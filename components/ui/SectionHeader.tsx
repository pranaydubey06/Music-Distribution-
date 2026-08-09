import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  /** Display-font heading. */
  title: ReactNode
  /** Optional supporting copy below the title. */
  description?: ReactNode
  /** Optional leading icon. */
  icon?: LucideIcon
  /** Optional count shown as a mono pill beside the title. */
  count?: number
  /** Actions (search, filters, buttons) aligned to the right on desktop. */
  actions?: ReactNode
  className?: string
}

/**
 * Standardized page/section heading: display-font title, optional count pill,
 * description and a responsive actions slot. Gives every admin tab a matching
 * header rhythm.
 */
export default function SectionHeader({
  title,
  description,
  icon: Icon,
  count,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-[2.5px] border-ink bg-canary shadow-[2px_2px_0_0_var(--color-ink)]">
              <Icon className="h-4 w-4 text-ink" aria-hidden="true" />
            </span>
          ) : null}
          <h2 className="font-display text-xl uppercase tracking-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {typeof count === 'number' ? (
            <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-xs font-bold text-ink-soft">
              {count}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm font-medium text-ink-soft">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
