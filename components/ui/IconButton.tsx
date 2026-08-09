import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type IconButtonVariant = 'neutral' | 'danger'

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  neutral: 'bg-white text-ink hover:bg-punch hover:text-white',
  danger: 'bg-punch text-white hover:bg-punch-deep',
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  /** Accessible label — required since the button has no text. */
  label: string
  variant?: IconButtonVariant
  size?: 'sm' | 'md'
}

/**
 * Square icon-only button with an accessible label. Standardizes the close /
 * delete / toggle buttons that were re-implemented ad-hoc across components.
 */
export default function IconButton({
  icon: Icon,
  label,
  variant = 'neutral',
  size = 'md',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'brutal-press flex shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        VARIANT_STYLES[variant],
        className
      )}
      {...props}
    >
      <Icon className={cn(size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} aria-hidden="true" />
    </button>
  )
}
