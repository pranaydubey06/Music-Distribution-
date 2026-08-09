import { cn } from '@/lib/utils'
import type { ReleaseStatus } from '@/lib/types'

const FILL_STYLES: Record<ReleaseStatus, string> = {
  Draft: 'bg-white text-ink-soft',
  'Pending Review': 'bg-canary text-ink',
  'Needs Changes': 'bg-surface-raised text-ink',
  Approved: 'bg-cobalt text-white',
  'Sent to Platforms': 'bg-ink text-paper',
  Live: 'bg-lime text-ink',
  Rejected: 'bg-punch text-white',
}

const LABELS: Record<ReleaseStatus, string> = {
  Draft: 'Draft',
  'Pending Review': 'Pending',
  'Needs Changes': 'Changes',
  Approved: 'Approved',
  'Sent to Platforms': 'Sent',
  Live: 'Live',
  Rejected: 'Rejected',
}

/** The recurring signature motif: a stamped, slightly rotated status badge. */
export default function StatusBadge({ status }: { status: ReleaseStatus }) {
  return (
    <span
      className={cn(
        'stamp-rotate inline-flex w-fit items-center whitespace-nowrap rounded-md border-[2.5px] border-ink px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] shadow-[2px_2px_0_0_var(--color-ink)]',
        FILL_STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  )
}
