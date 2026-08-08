import { Activity } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { ActivityLog } from '@/lib/types'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

type BadgeVariant = 'neutral' | 'canary' | 'cobalt' | 'lime' | 'punch' | 'ink'

const ACTION_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  artist_registered:          { label: 'Registered',          variant: 'cobalt' },
  release_submitted:          { label: 'Submitted',            variant: 'canary' },
  release_edited:             { label: 'Edited',               variant: 'neutral' },
  release_duplicated:         { label: 'Duplicated',           variant: 'neutral' },
  release_deleted:            { label: 'Deleted',              variant: 'punch' },
  release_approved:           { label: 'Approved',             variant: 'lime' },
  release_rejected:           { label: 'Rejected',             variant: 'punch' },
  release_needs_changes:      { label: 'Needs changes',        variant: 'canary' },
  release_sent:               { label: 'Sent',                 variant: 'ink' },
  release_live:               { label: 'Live',                 variant: 'lime' },
  release_deletion_scheduled: { label: 'Deletion scheduled',   variant: 'punch' },
  release_deletion_cancelled: { label: 'Deletion cancelled',   variant: 'neutral' },
  ticket_opened:              { label: 'Ticket opened',        variant: 'cobalt' },
  ticket_resolved:            { label: 'Ticket resolved',      variant: 'lime' },
  ticket_reopened:            { label: 'Ticket reopened',      variant: 'canary' },
  profile_updated:            { label: 'Profile updated',      variant: 'neutral' },
}

interface ActivityLogsPanelProps {
  logs: ActivityLog[]
}

export default function ActivityLogsPanel({ logs }: ActivityLogsPanelProps) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        message="Actions taken across the platform will appear here in real time."
      />
    )
  }

  return (
    <Card className="divide-y-[2.5px] divide-ink overflow-hidden">
      {logs.map((log) => {
        const meta = ACTION_LABELS[log.action] ?? { label: log.action, variant: 'neutral' as BadgeVariant }

        return (
          <div
            key={log.id}
            className="flex flex-wrap items-start gap-3 p-4 transition-colors hover:bg-paper"
          >
            <Badge variant={meta.variant} className="mt-0.5 shrink-0">
              {meta.label}
            </Badge>
            <div className="min-w-0 flex-1">
              {log.artist_name ? (
                <p className="text-sm font-bold text-ink">{log.artist_name}</p>
              ) : null}
              {log.detail ? (
                <p className="text-sm font-medium text-ink-soft">{log.detail}</p>
              ) : null}
              <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                {formatDateTime(log.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
