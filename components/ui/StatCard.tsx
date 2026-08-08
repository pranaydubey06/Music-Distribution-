import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatVariant = 'neutral' | 'canary' | 'cobalt' | 'lime' | 'punch'

const VARIANT_STYLES: Record<StatVariant, string> = {
  neutral: 'bg-white text-ink',
  canary: 'bg-canary text-ink',
  cobalt: 'bg-cobalt text-white',
  lime: 'bg-lime text-ink',
  punch: 'bg-punch text-white',
}

interface StatCardProps {
  label: string
  value: number | string
  variant?: StatVariant
  icon?: LucideIcon
  /** Optional short caption beneath the label. */
  caption?: string
  className?: string
}

/**
 * Dashboard statistic tile. Large display-font number, mono label, optional
 * leading icon. Variant tints the whole tile, keeping the brutalist block look
 * but with consistent sizing, spacing and shadow across all stats.
 */
export default function StatCard({
  label,
  value,
  variant = 'neutral',
  icon: Icon,
  caption,
  className,
}: StatCardProps) {
  const hasAccent = variant !== 'neutral'
  return (
    <div
      className={cn(
        'brutal-hover flex flex-col gap-2 rounded-xl border-[3px] border-ink p-4 shadow-[4px_4px_0_0_var(--color-ink)]',
        VARIANT_STYLES[variant],
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] opacity-75">
          {label}
        </p>
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        ) : null}
      </div>
      <p className="font-display text-3xl leading-none tracking-tight">{value}</p>
      {caption ? (
        <p className="font-mono text-[10px] font-medium opacity-70">{caption}</p>
      ) : null}
      {!hasAccent && !caption ? <span className="sr-only">{label}</span> : null}
    </div>
  )
}
