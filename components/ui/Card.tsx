import type { HTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>
}

export default function Card({ className, children, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border-[3px] border-ink bg-white shadow-[5px_5px_0_0_var(--color-ink)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
