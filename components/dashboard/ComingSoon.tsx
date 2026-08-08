import type { LucideIcon } from 'lucide-react'
import { Lock } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <Card className="flex flex-col items-center px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-ink bg-canary">
          <Icon className="h-7 w-7 text-ink" />
        </span>
        <h1 className="mt-5 font-display text-2xl uppercase text-ink">{title}</h1>
        <p className="mt-2 max-w-sm text-sm font-medium text-ink-soft">{description}</p>
        <span className="mt-4 flex items-center gap-1.5 rounded-md border-2 border-ink bg-paper px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
          <Lock className="h-3 w-3" />
          Coming soon
        </span>
      </Card>
    </div>
  )
}
