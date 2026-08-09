'use client'

import { useEffect, useState } from 'react'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import { formatDate } from '@/lib/utils'
import type { ReleaseWithTracks } from '@/lib/types'
import Card from '@/components/ui/Card'
import StatusBadge from '@/components/StatusBadge'

const TYPE_COLORS: Record<string, string> = {
  Single: 'bg-canary',
  EP: 'bg-cobalt',
  Album: 'bg-punch',
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-surface-raised',
  'Pending Review': 'bg-canary',
  'Needs Changes': 'bg-canary-deep',
  Approved: 'bg-cobalt',
  'Sent to Platforms': 'bg-cobalt-deep',
  Live: 'bg-lime',
  Rejected: 'bg-punch',
}

interface BarRow {
  label: string
  count: number
  colorClass: string
}

/** Horizontal bar chart in the house neobrutalist style — no chart library. */
function BarChart({ rows }: { rows: BarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))

  return (
    <div className="flex flex-col gap-3">
      {rows.map(({ label, count, colorClass }) => (
        <div key={label} className="grid grid-cols-[110px_1fr_2ch] items-center gap-3 sm:grid-cols-[150px_1fr_3ch]">
          <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">
            {label}
          </p>
          <div className="h-6 rounded-md border-2 border-ink/25 bg-paper">
            {count > 0 ? (
              <div
                className={`h-full rounded-[4px] border-2 border-ink ${colorClass} transition-all duration-500`}
                style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
              />
            ) : null}
          </div>
          <p className="text-right font-display text-sm text-ink">{count}</p>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { artist } = useArtistSession()
  const [releases, setReleases] = useState<ReleaseWithTracks[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    fetch(`/api/releases?artist_id=${artist.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (isMounted) setReleases(result.releases ?? [])
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [artist.id])

  const byType = {
    Single: releases.filter((r) => r.release_type === 'Single').length,
    EP: releases.filter((r) => r.release_type === 'EP').length,
    Album: releases.filter((r) => r.release_type === 'Album').length,
  }

  const byStatus = {
    Draft: releases.filter((r) => r.status === 'Draft').length,
    'Pending Review': releases.filter((r) => r.status === 'Pending Review').length,
    'Needs Changes': releases.filter((r) => r.status === 'Needs Changes').length,
    Approved: releases.filter((r) => r.status === 'Approved').length,
    'Sent to Platforms': releases.filter((r) => r.status === 'Sent to Platforms').length,
    Live: releases.filter((r) => r.status === 'Live').length,
    Rejected: releases.filter((r) => r.status === 'Rejected').length,
  }

  const timeline = [...releases].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <header className="mb-8">
        <p className="inline-block -rotate-2 bg-cobalt px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          Catalog overview
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase text-ink">Analytics</h1>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          A look at what you&apos;ve submitted, by type and by status.
        </p>
      </header>

      {isLoading ? (
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
          Loading…
        </p>
      ) : releases.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="font-display text-lg uppercase text-ink">Nothing to show yet</p>
          <p className="mt-2 text-sm font-medium text-ink-soft">
            Submit a release and your analytics will show up here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              By release type
            </p>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(byType).map(([type, count]) => (
                <Card key={type} className="p-4 text-center">
                  <p className="font-display text-3xl text-ink">{count}</p>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-soft">
                    {type}
                  </p>
                </Card>
              ))}
            </div>
            <Card className="mt-4 p-5">
              <BarChart
                rows={Object.entries(byType).map(([label, count]) => ({
                  label,
                  count,
                  colorClass: TYPE_COLORS[label] ?? 'bg-canary',
                }))}
              />
            </Card>
          </section>

          <section>
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              By status
            </p>
            <Card className="p-5">
              <BarChart
                rows={Object.entries(byStatus).map(([label, count]) => ({
                  label,
                  count,
                  colorClass: STATUS_COLORS[label] ?? 'bg-canary',
                }))}
              />
            </Card>
          </section>

          <section>
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Submission timeline
            </p>
            <Card className="divide-y-[2.5px] divide-ink overflow-hidden">
              {timeline.map((release) => (
                <div key={release.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{release.title}</p>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                      {release.release_type} · Submitted {formatDate(release.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={release.status} />
                </div>
              ))}
            </Card>
          </section>
        </div>
      )}
    </div>
  )
}
