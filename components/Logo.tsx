import { cn } from '@/lib/utils'

export default function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col leading-none', className)}>
      <span className="font-display text-2xl uppercase tracking-tight text-ink">
        Spilrix
      </span>
      <span className="mt-1.5 inline-block w-fit -rotate-2 bg-canary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-ink">
        Distribution
      </span>
    </div>
  )
}
