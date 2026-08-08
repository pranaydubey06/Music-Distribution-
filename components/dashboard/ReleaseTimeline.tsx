import { Check, X } from 'lucide-react'
import type { ReleaseStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Visual pipeline for a release: Submitted → Under Review → Approved →
 * Sent to Platforms → Live. Rejected replaces the tail with a rejected stop.
 * Drafts render nothing (they haven't entered the pipeline yet).
 */

const PIPELINE: { key: ReleaseStatus | 'Submitted'; label: string }[] = [
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Pending Review', label: 'Under review' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Sent to Platforms', label: 'Sent' },
  { key: 'Live', label: 'Live' },
]

// How far along the pipeline each status is (index of the current step).
const PROGRESS: Partial<Record<ReleaseStatus, number>> = {
  'Pending Review': 1,
  Approved: 2,
  'Sent to Platforms': 3,
  Live: 4,
}

export default function ReleaseTimeline({ status }: { status: ReleaseStatus }) {
  if (status === 'Draft') return null

  const isRejected = status === 'Rejected'
  const needsChanges = status === 'Needs Changes'
  // Rejected / needs-changes releases made it through "Under review" first.
  const progress = isRejected || needsChanges ? 1 : (PROGRESS[status] ?? 0)
  const steps = isRejected
    ? [...PIPELINE.slice(0, 2), { key: 'Rejected' as const, label: 'Rejected' }]
    : needsChanges
      ? [...PIPELINE.slice(0, 2), { key: 'Needs Changes' as const, label: 'Changes requested' }]
      : PIPELINE

  return (
    <ol className="mt-3 flex flex-wrap items-center gap-y-2">
      {steps.map((step, index) => {
        const isRejectedStop = step.key === 'Rejected'
        const isChangesStop = step.key === 'Needs Changes'
        const isDone = !isRejectedStop && !isChangesStop && index < progress
        const isCurrent = !isRejectedStop && !isChangesStop && index === progress

        return (
          <li key={step.key} className="flex items-center">
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  'mx-1 h-[3px] w-4 sm:w-6',
                  isDone || isCurrent || isRejectedStop || isChangesStop
                    ? 'bg-ink'
                    : 'bg-ink/20'
                )}
              />
            ) : null}
            <span
              className={cn(
                'flex items-center gap-1 rounded-md border-2 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.08em]',
                isRejectedStop
                  ? 'border-ink bg-punch text-white'
                  : isChangesStop
                    ? 'border-ink bg-canary text-ink shadow-[2px_2px_0_0_var(--color-ink)]'
                    : isCurrent
                    ? 'border-ink bg-canary text-ink shadow-[2px_2px_0_0_var(--color-ink)]'
                    : isDone
                      ? 'border-ink bg-lime text-ink'
                      : 'border-ink/30 bg-transparent text-ink-faint'
              )}
            >
              {isDone ? <Check className="h-3 w-3" /> : null}
              {isRejectedStop ? <X className="h-3 w-3" /> : null}
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
