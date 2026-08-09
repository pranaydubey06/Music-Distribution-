'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, User as UserIcon, X } from 'lucide-react'
import type { Artist, ReleaseWithTracks, TicketWithMessages, TicketMessage, TicketStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import type { ArtistReleaseCounts, ArtistTicketCounts } from '@/components/admin/ArtistRoster'
import Card from '@/components/ui/Card'
import IconButton from '@/components/ui/IconButton'
import ReleaseManager from '@/components/admin/ReleaseManager'
import TicketsList from '@/components/admin/TicketsList'
import UploadAccessPanel from '@/components/admin/UploadAccessPanel'

interface ArtistDetailPanelProps {
  artist: Artist
  releases: ReleaseWithTracks[]
  counts: ArtistReleaseCounts
  tickets: TicketWithMessages[]
  ticketCounts: ArtistTicketCounts
  passcode: string
  onReleaseChange: (release: ReleaseWithTracks) => void
  onTicketStatusChange: (ticketId: string, status: TicketStatus) => void
  onNewMessage: (ticketId: string, message: TicketMessage) => void
  onClose: () => void
}

export default function ArtistDetailPanel({
  artist,
  releases,
  counts,
  tickets,
  ticketCounts,
  passcode,
  onReleaseChange,
  onTicketStatusChange,
  onNewMessage,
  onClose,
}: ArtistDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [showTickets, setShowTickets] = useState(true)

  useEffect(() => {
    // A scroll call, not a setState call — bringing a newly opened panel
    // into view is exactly the kind of external-system side effect
    // useEffect exists for.
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [artist.id])

  return (
    <Card
      ref={panelRef}
      className="animate-fade-up overflow-hidden shadow-[6px_6px_0_0_var(--color-cobalt)]"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-[3px] border-ink bg-cobalt px-5 py-5 md:px-6">
        <div className="flex items-center gap-4">
          {artist.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.photo_url}
              alt={artist.name}
              className="h-12 w-12 shrink-0 rounded-md border-[2.5px] border-ink object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink bg-white">
              <UserIcon className="h-5 w-5 text-ink" />
            </span>
          )}
          <div>
            <p className="font-display text-lg uppercase tracking-tight text-white">{artist.name}</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
              UID {artist.display_id} · Joined {formatDate(artist.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
            <CountChip label="Total" value={counts.total} fillClassName="bg-white text-ink" />
            <CountChip label="Pending" value={counts.pending} fillClassName="bg-canary text-ink" />
            <CountChip label="Approved" value={counts.approved} fillClassName="bg-white text-ink" />
            <CountChip label="Live" value={counts.live} fillClassName="bg-lime text-ink" />
          </div>

          <IconButton icon={X} label="Close artist panel" onClick={onClose} className="bg-white text-ink hover:bg-punch hover:text-white" />
        </div>
      </div>

      <div className="space-y-8 p-4 md:p-6">
        <UploadAccessPanel artistId={artist.id} passcode={passcode} />

        <section>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm border-2 border-ink bg-canary" aria-hidden="true" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Releases
            </p>
          </div>
          <ReleaseManager
            releases={releases}
            passcode={passcode}
            onReleaseChange={onReleaseChange}
            emptyMessage={`${artist.name} hasn't submitted anything yet.`}
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm border-2 border-ink bg-cobalt" aria-hidden="true" />
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Support tickets
                {ticketCounts.total > 0 ? (
                  <span className="ml-1 font-normal">({ticketCounts.total})</span>
                ) : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTickets((prev) => !prev)}
              aria-expanded={showTickets}
              className="brutal-press flex items-center gap-1.5 rounded-md border-2 border-ink bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors hover:bg-paper"
            >
              {showTickets ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> Show
                </>
              )}
            </button>
          </div>
          {showTickets ? (
            <TicketsList
              tickets={tickets}
              passcode={passcode}
              onStatusChange={onTicketStatusChange}
              onNewMessage={onNewMessage}
            />
          ) : null}
        </section>
      </div>
    </Card>
  )
}

function CountChip({
  label,
  value,
  fillClassName,
}: {
  label: string
  value: number
  fillClassName: string
}) {
  return (
    <span
      className={`rounded-md border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${fillClassName}`}
    >
      {value} {label}
    </span>
  )
}
