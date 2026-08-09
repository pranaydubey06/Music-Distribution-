import { Children, isValidElement, useEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/utils'

const FIELD_BASE =
  'w-full rounded-lg border-[3px] border-ink bg-white px-3.5 py-2.5 font-body text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow duration-150 focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none disabled:opacity-50'

interface FieldWrapperProps {
  label: string
  hint?: string
  required?: boolean
  htmlFor: string
}

function FieldLabel({ label, hint, required, htmlFor }: FieldWrapperProps) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink"
      >
        {label}
        {required ? <span className="text-punch"> *</span> : null}
      </label>
      {hint ? (
        <span className="font-mono text-[10px] text-ink-faint">{hint}</span>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string | boolean
}

export function Input({ label, hint, error, id, required, className, ...props }: InputProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      <FieldLabel label={label} hint={hint} required={required} htmlFor={fieldId} />
      <input id={fieldId} required={required} aria-invalid={Boolean(error)} className={cn(FIELD_BASE, error && 'border-punch', className)} {...props} />
      {typeof error === 'string' ? <p className="mt-1 text-xs font-medium text-punch">{error}</p> : null}
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hint?: string
  error?: string | boolean
}

function getOptionLabel(children: ReactNode) {
  return Children.toArray(children)
    .map((child) => typeof child === 'string' || typeof child === 'number' ? String(child) : '')
    .join('')
}

export function Select({
  label,
  hint,
  error,
  id,
  required,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
}: SelectProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? ''))
  const selectedValue = value === undefined ? internalValue : String(value)
  const options = Children.toArray(children)
    .filter((child): child is ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }> => isValidElement(child) && child.type === 'option')
    .map((option) => ({
      value: String(option.props.value ?? getOptionLabel(option.props.children) ?? ''),
      label: getOptionLabel(option.props.children) || String(option.props.value ?? ''),
      disabled: option.props.disabled ?? false,
    }))
  const selectedOption = options.find((option) => option.value === selectedValue)

  useEffect(() => {
    const closeWhenClickedOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', closeWhenClickedOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeWhenClickedOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const selectOption = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue)
    setIsOpen(false)
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as ChangeEvent<HTMLSelectElement>)
  }

  return (
    <div ref={containerRef} className="relative">
      <FieldLabel label={label} hint={hint} required={required} htmlFor={fieldId} />
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        type="button"
        id={fieldId}
        disabled={disabled}
        data-invalid={Boolean(error) || undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          FIELD_BASE,
          'flex cursor-pointer items-center justify-between gap-3 text-left',
          error && 'border-punch',
          isOpen && 'shadow-[3px_3px_0_0_var(--color-cobalt)]',
          className
        )}
      >
        <span className={cn(!selectedOption && 'text-ink-faint')}>{selectedOption?.label || 'Select an option'}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute z-40 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border-[3px] border-ink bg-paper p-1.5 shadow-[5px_5px_0_0_var(--color-ink)] animate-fade-up"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              disabled={option.disabled}
              onClick={() => selectOption(option.value)}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left font-body text-sm font-semibold transition-colors',
                option.value === selectedValue ? 'bg-cobalt text-white' : 'text-ink hover:bg-canary',
                option.disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <span>{option.label}</span>
              {option.value === selectedValue ? <Check className="h-4 w-4 shrink-0" /> : null}
            </button>
          ))}
        </div>
      )}
      {typeof error === 'string' ? <p className="mt-1 text-xs font-medium text-punch">{error}</p> : null}
    </div>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

export function Textarea({ label, hint, id, required, className, ...props }: TextareaProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      <FieldLabel label={label} hint={hint} required={required} htmlFor={fieldId} />
      <textarea
        id={fieldId}
        required={required}
        className={cn(FIELD_BASE, 'min-h-32 resize-y', className)}
        {...props}
      />
    </div>
  )
}
