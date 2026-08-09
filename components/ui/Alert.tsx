import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const VARIANT_STYLES: Record<
  AlertVariant,
  { fill: string; Icon: typeof Info }
> = {
  error: { fill: 'bg-punch text-white', Icon: XCircle },
  success: { fill: 'bg-lime text-ink', Icon: CheckCircle2 },
  warning: { fill: 'bg-canary text-ink', Icon: AlertTriangle },
  info: { fill: 'bg-cobalt text-white', Icon: Info },
}

interface AlertProps {
  children: ReactNode
  variant?: AlertVariant
  title?: string
  className?: string
  role?: 'alert' | 'status'
}

/**
 * Consistent full-width notice banner for inline errors, confirmations and
 * warnings. Replaces the bespoke per-component error/success banners.
 */
export default function Alert({
  children,
  variant = 'error',
  title,
  className,
  role = 'alert',
}: AlertProps) {
  const { fill, Icon } = VARIANT_STYLES[variant]

  return (
    <div
      role={role}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border-[2.5px] border-ink px-4 py-3 text-sm font-bold shadow-[3px_3px_0_0_var(--color-ink)] animate-fade-in',
        fill,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold leading-tight">{title}</p> : null}
        <div className={cn(title && 'mt-0.5 font-medium')}>{children}</div>
      </div>
    </div>
  )
}
