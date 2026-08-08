import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  className?: string
}

/** Full-width centered loading indicator with mono caption. */
export default function LoadingState({
  label = 'Loading…',
  className,
}: LoadingStateProps) {
  return (
    <div className={cn('flex items-center gap-3 py-10', className)}>
      <svg
        className="h-4 w-4 animate-spin text-ink-faint"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
      </svg>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
        {label}
      </p>
    </div>
  )
}
