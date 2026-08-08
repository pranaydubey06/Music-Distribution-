import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  /** Optional count badge shown after the label. */
  count?: number
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible label for the whole group. */
  label?: string
  className?: string
}

/**
 * A row of mutually-exclusive filter chips (status filters, tabs). Replaces the
 * inline filter button groups in the admin page and ArtistDetailPanel.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'brutal-press inline-flex items-center gap-1.5 rounded-md border-[2.5px] border-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] transition-colors',
              isActive
                ? 'bg-canary text-ink shadow-[2px_2px_0_0_var(--color-ink)]'
                : 'bg-white text-ink-soft hover:bg-paper hover:text-ink'
            )}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span
                className={cn(
                  'rounded-sm px-1 text-[9px]',
                  isActive ? 'bg-ink/15' : 'bg-ink/10'
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
