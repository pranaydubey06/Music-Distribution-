'use client'

import { Clock, Disc3, LifeBuoy, Music2, TrendingUp, User, XCircle } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import Card from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/StatusBadge'
import type { ReleaseStatus } from '@/lib/types'

interface OverviewStats {
  totalArtists: number
  totalReleases: number
  pendingReleases: number
  liveReleases: number
  rejectedReleases: number
  openTickets: number
}

interface RecentRelease {
  id: string
  title: string
  release_type: string
  artist_name: string
  status: ReleaseStatus
  cover_art_url: string | null
  created_at: string
}

interface AdminOverviewProps {
  stats: OverviewStats
  recentReleases: RecentRelease[]
}

export default function AdminOverview({ stats, recentReleases }: AdminOverviewProps) {
  const STAT_CARDS = [
    { label: 'Artists', value: stats.totalArtists, variant: 'neutral', icon: User },
    { label: 'Total releases', value: stats.totalReleases, variant: 'neutral', icon: Disc3 },
    { label: 'Pending', value: stats.pendingReleases, variant: 'canary', icon: Clock },
    { label: 'Live', value: stats.liveReleases, variant: 'lime', icon: TrendingUp },
    { label: 'Rejected', value: stats.rejectedReleases, variant: 'punch', icon: XCircle },
    { label: 'Open tickets', value: stats.openTickets, variant: 'cobalt', icon: LifeBuoy },
  ] as const

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {STAT_CARDS.map(({ label, value, variant, icon }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            variant={variant}
            icon={icon}
          />
        ))}
      </div>

      {recentReleases.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border-2 border-ink bg-canary" aria-hidden="true" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink-faint">
              Recent uploads
            </p>
          </div>
          <Card className="divide-y-[2.5px] divide-ink overflow-hidden">
            {recentReleases.map((release) => (
              <div key={release.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-paper">
                {release.cover_art_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={release.cover_art_url}
                    alt={release.title}
                    className="h-11 w-11 shrink-0 rounded-md border-2 border-ink object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-paper">
                    <Music2 className="h-4 w-4 text-ink-faint" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{release.title}</p>
                  <p className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint">
                    {release.release_type} · {release.artist_name} · {formatDateTime(release.created_at)}
                  </p>
                </div>
                <StatusBadge status={release.status} />
              </div>
            ))}
          </Card>
        </div>
      ) : null}
    </div>
  )
}
