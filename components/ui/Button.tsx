import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  isLoading?: boolean
  size?: Size
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-canary text-ink hover:bg-canary-deep disabled:bg-canary/50',
  secondary: 'bg-cobalt text-white hover:bg-cobalt-deep disabled:bg-cobalt/50',
  ghost: 'bg-white text-ink hover:bg-paper disabled:text-ink-faint',
  danger: 'bg-punch text-white hover:bg-punch-deep disabled:bg-punch/50',
}

export default function Button({
  variant = 'primary',
  isLoading = false,
  size = 'md',
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'brutal-press inline-flex items-center justify-center gap-2 rounded-lg border-[3px] border-ink px-4 py-2.5 font-body text-sm font-bold uppercase tracking-wide shadow-[3px_3px_0_0_var(--color-ink)] transition-colors duration-150 disabled:cursor-not-allowed disabled:shadow-none',
        VARIANT_STYLES[variant],
        size === 'sm' && 'px-2.5 py-1.5 text-xs border-[2px] shadow-[2px_2px_0_0_var(--color-ink)]',
        size === 'lg' && 'px-5 py-3 text-base',
        className
      )}
      {...props}
    >
      {isLoading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-[2.5px] border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  )
}
