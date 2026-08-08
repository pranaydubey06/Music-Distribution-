import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'neutral'
  | 'canary'
  | 'cobalt'
  | 'lime'
  | 'punch'
  | 'ink'
  | 'raised'

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  neutral: 'bg-white text-ink',
  canary: 'bg-canary text-ink',
  cobalt: 'bg-cobalt text-white',
  lime: 'bg-lime text-ink',
  punch: 'bg-punch text-white',
  ink: 'bg-ink text-paper',
  raised: 'bg-surface-raised text-ink',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  /** Render with the signature rubber-stamp rotation. */
  stamp?: boolean
  className?: string
}

/**
 * The single source of truth for the small mono labels sprinkled across the
 * admin panel (counts, flags, statuses, action chips). Keeps border weight,
 * tracking and corner radius consistent everywhere.
 */
export default function Badge({
  children,
  variant = 'neutral',
  stamp = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-md border-[2.5px] border-ink px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] shadow-[2px_2px_0_0_var(--color-ink)]',
        stamp && 'stamp-rotate',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
