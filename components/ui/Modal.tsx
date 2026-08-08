'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Footer actions, usually a pair of buttons. */
  footer?: ReactNode
  className?: string
}

/**
 * Accessible overlay dialog: traps focus on the panel, closes on Escape and
 * backdrop click, locks body scroll while open. Replaces inline "reveal a form
 * inside the card" patterns with a focused, consistent surface.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Dialog'}
    >
      <div
        className="absolute inset-0 bg-ink/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-xl border-[3px] border-ink bg-white shadow-[9px_9px_0_0_var(--color-ink)] animate-fade-up',
          className
        )}
      >
        {(title || description) ? (
          <div className="flex items-start justify-between gap-4 border-b-[2.5px] border-ink bg-paper px-5 py-4">
            <div className="min-w-0">
              {title ? (
                <h3 className="font-display text-lg uppercase tracking-tight text-ink">
                  {title}
                </h3>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-sm font-medium text-ink-soft">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="brutal-press flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink bg-white text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors hover:bg-punch hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <div className="px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t-[2.5px] border-ink bg-paper px-5 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
