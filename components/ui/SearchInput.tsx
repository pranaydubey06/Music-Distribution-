import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Accessible label for the field. */
  label?: string
  className?: string
}

/**
 * Branded search field: leading magnifier, trailing clear button, cobalt focus
 * shadow that matches the rest of the form controls.
 */
export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className,
}: SearchInputProps) {
  return (
    <div className={cn('relative w-full max-w-xs', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        className="w-full rounded-lg border-[3px] border-ink bg-white py-2 pl-9 pr-9 font-body text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow duration-150 focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="brutal-press absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md border-2 border-ink bg-paper text-ink-soft transition-colors hover:bg-punch hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
