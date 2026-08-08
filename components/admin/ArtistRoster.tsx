import { LifeBuoy, UserSearch, User as UserIcon } from 'lucide-react'
import type { Artist } from '@/lib/types'
import { formatDate, cn } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

export interface ArtistReleaseCounts {
  total: number
  pending: number
  approved: number
  sent: number
  live: number
  rejected: number
}

export interface ArtistTicketCounts {
  total: number
  open: number
}

interface ArtistRosterProps {
  artists: Artist[]
  countsByArtistId: Record<string, ArtistReleaseCounts>
  ticketCountsByArtistId: Record<string, ArtistTicketCounts>
  selectedArtistId: string | null
  onSelectArtist: (artistId: string) => void
}

export default function ArtistRoster({
  artists,
  countsByArtistId,
  ticketCountsByArtistId,
  selectedArtistId,
  onSelectArtist,
}: ArtistRosterProps) {
  if (artists.length === 0) {
    return (
      <EmptyState
        icon={UserSearch}
        title="No artists found"
        message="No artists match that search. Try a different name or UID."
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => {
        const counts = countsByArtistId[artist.id] ?? {
          total: 0,
          pending: 0,
          approved: 0,
          sent: 0,
          live: 0,
          rejected: 0,
        }
        const ticketCounts = ticketCountsByArtistId[artist.id] ?? { total: 0, open: 0 }
        const isSelected = artist.id === selectedArtistId

        return (
          <button
            key={artist.id}
            type="button"
            onClick={() => onSelectArtist(artist.id)}
            aria-pressed={isSelected}
            className={cn(
              'brutal-hover flex flex-col gap-3 rounded-xl border-[3px] border-ink bg-white p-4 text-left',
              isSelected
                ? 'shadow-[5px_5px_0_0_var(--color-cobalt)]'
                : 'shadow-[5px_5px_0_0_var(--color-ink)]'
            )}
          >
            <div className="flex items-center gap-3.5">
              {artist.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.photo_url}
                  alt={artist.name}
                  className="h-12 w-12 shrink-0 rounded-md border-[2.5px] border-ink object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink bg-canary">
                  <UserIcon className="h-5 w-5 text-ink" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-display text-sm uppercase tracking-tight text-ink">{artist.name}</p>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  UID {artist.display_id}
                </p>
                <p className="font-mono text-[10px] text-ink-faint">
                  Joined {formatDate(artist.created_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="neutral">
                {counts.total} {counts.total === 1 ? 'release' : 'releases'}
              </Badge>
              {counts.pending > 0 ? (
                <Badge variant="canary" stamp>
                  {counts.pending} pending
                </Badge>
              ) : null}
              {ticketCounts.open > 0 ? (
                <Badge variant="cobalt" stamp>
                  <LifeBuoy className="h-3 w-3" aria-hidden="true" />
                  {ticketCounts.open} open
                </Badge>
              ) : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
