import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * A pulsing placeholder block. Use for loading states instead of bare spinners
 * so the layout doesn't jump when data arrives.
 */
export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-md border-[2.5px] border-ink/10 bg-ink/10 animate-skeleton',
        className
      )}
    />
  )
}
