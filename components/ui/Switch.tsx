'use client'

import { cn } from '@/lib/utils'

type SwitchVariant = 'neutral' | 'danger' | 'success'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible label. */
  label: string
  /** Color when ON. Defaults to success (lime/green = "enabled"). */
  variant?: SwitchVariant
  disabled?: boolean
  className?: string
}

const ON_COLORS: Record<SwitchVariant, string> = {
  neutral: 'bg-cobalt',
  success: 'bg-lime',
  danger: 'bg-punch',
}

/**
 * Accessible toggle switch (role="switch"). Replaces the bespoke toggles in
 * AdminSettingsPanel and UploadAccessPanel with a single consistent control.
 */
export default function Switch({
  checked,
  onChange,
  label,
  variant = 'success',
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'brutal-press relative h-7 w-12 shrink-0 rounded-full border-[2.5px] border-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? ON_COLORS[variant] : 'bg-white',
        className
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full border-[2px] border-ink bg-white shadow-[1px_1px_0_0_var(--color-ink)] transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
