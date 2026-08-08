'use client'

import { useEffect, useMemo, useState } from 'react'
import { Disc3, LifeBuoy, Users } from 'lucide-react'
import AdminGate from '@/components/admin/AdminGate'
import AdminShell from '@/components/admin/AdminShell'
import { type AdminTab } from '@/components/admin/admin-nav'
import ArtistRoster, {
  type ArtistReleaseCounts,
  type ArtistTicketCounts,
} from '@/components/admin/ArtistRoster'
import ArtistDetailPanel from '@/components/admin/ArtistDetailPanel'
import StorageUsageMeter from '@/components/admin/StorageUsageMeter'
import AdminOverview from '@/components/admin/AdminOverview'
import ActivityLogsPanel from '@/components/admin/ActivityLogsPanel'
import AdminSettingsPanel from '@/components/admin/AdminSettingsPanel'
import ReleaseManager from '@/components/admin/ReleaseManager'
import TicketsList from '@/components/admin/TicketsList'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import SearchInput from '@/components/ui/SearchInput'
import SectionHeader from '@/components/ui/SectionHeader'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { useBrowserStorageValue } from '@/lib/use-browser-storage-value'
import { removeStorageItem, setStorageItem } from '@/lib/browser-storage'
import type {
  ActivityLog,
  AppSettings,
  Artist,
  ReleaseWithTracks,
  StorageUsage,
  TicketWithMessages,
  TicketMessage,
  TicketStatus,
} from '@/lib/types'

const PASSCODE_KEY = 'spilrix_admin_passcode'

const RELEASE_FILTERS = [
  'All',
  'Pending Review',
  'Needs Changes',
  'Approved',
  'Sent to Platforms',
  'Live',
  'Rejected',
] as const

const TICKET_FILTERS = ['All', 'Open', 'Closed'] as const

interface OverviewData {
  stats: {
    totalArtists: number
    totalReleases: number
    pendingReleases: number
    liveReleases: number
    rejectedReleases: number
    openTickets: number
  }
  recentReleases: {
    id: string
    title: string
    release_type: string
    artist_name: string
    status: ReleaseWithTracks['status']
    cover_art_url: string | null
    created_at: string
  }[]
}

export default function AdminPage() {
  const passcode = useBrowserStorageValue('sessionStorage', PASSCODE_KEY)

  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [artists, setArtists] = useState<Artist[] | null>(null)
  const [releases, setReleases] = useState<ReleaseWithTracks[] | null>(null)
  const [tickets, setTickets] = useState<TicketWithMessages[] | null>(null)
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [activityLogs, setActivityLogs] = useState<ActivityLog[] | null>(null)
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [artistSearch, setArtistSearch] = useState('')
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null)
  const [releaseSearch, setReleaseSearch] = useState('')
  const [releaseFilter, setReleaseFilter] =
    useState<(typeof RELEASE_FILTERS)[number]>('All')
  const [ticketFilter, setTicketFilter] =
    useState<(typeof TICKET_FILTERS)[number]>('All')

  useEffect(() => {
    if (!passcode) return

    let isMounted = true

    async function loadAdminData() {
      try {
        const headers = { 'x-admin-passcode': passcode as string }

        const [
          artistsRes,
          releasesRes,
          ticketsRes,
          storageRes,
          overviewRes,
          logsRes,
          settingsRes,
        ] = await Promise.all([
          fetch('/api/admin/artists', { headers }),
          fetch('/api/admin/releases', { headers }),
          fetch('/api/admin/tickets', { headers }),
          fetch('/api/admin/storage', { headers }),
          fetch('/api/admin/overview', { headers }),
          fetch('/api/admin/activity-logs', { headers }),
          fetch('/api/admin/settings', { headers }),
        ])

        if (!artistsRes.ok || !releasesRes.ok || !ticketsRes.ok) {
          removeStorageItem('sessionStorage', PASSCODE_KEY)
          throw new Error('Session expired. Enter the passcode again.')
        }

        const [
          artistsResult,
          releasesResult,
          ticketsResult,
        ] = await Promise.all([
          artistsRes.json(),
          releasesRes.json(),
          ticketsRes.json(),
        ])

        if (isMounted) {
          setArtists(artistsResult.artists ?? [])
          setReleases(releasesResult.releases ?? [])
          setTickets(ticketsResult.tickets ?? [])
          setError(null)
        }

        if (storageRes.ok && isMounted) {
          setStorageUsage((await storageRes.json()) as StorageUsage)
        }

        if (overviewRes.ok && isMounted) {
          setOverview(await overviewRes.json())
        }

        if (logsRes.ok && isMounted) {
          const logsResult = await logsRes.json()
          setActivityLogs(logsResult.logs ?? [])
        }

        if (settingsRes.ok && isMounted) {
          const settingsResult = await settingsRes.json()
          setAppSettings(settingsResult.settings as AppSettings)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Could not load admin data.')
        }
      }
    }

    loadAdminData()
    // Live-sync artist access, tickets, replies and release status. This is
    // intentionally client polling because the database tables are protected
    // by RLS and cannot be subscribed to directly by browser clients.
    const refreshInterval = window.setInterval(loadAdminData, 5000)
    const onFocus = () => { void loadAdminData() }
    window.addEventListener('focus', onFocus)

    return () => {
      isMounted = false
      window.clearInterval(refreshInterval)
      window.removeEventListener('focus', onFocus)
    }
  }, [passcode])

  const countsByArtistId = useMemo(() => {
    const counts: Record<string, ArtistReleaseCounts> = {}

    for (const release of releases ?? []) {
      const entry = counts[release.artist_id] ?? {
        total: 0, pending: 0, approved: 0, sent: 0, live: 0, rejected: 0,
      }

      entry.total += 1
      if (release.status === 'Pending Review') entry.pending += 1
      if (release.status === 'Approved') entry.approved += 1
      if (release.status === 'Sent to Platforms') entry.sent += 1
      if (release.status === 'Live') entry.live += 1
      if (release.status === 'Rejected') entry.rejected += 1

      counts[release.artist_id] = entry
    }

    return counts
  }, [releases])

  const ticketCountsByArtistId = useMemo(() => {
    const counts: Record<string, ArtistTicketCounts> = {}

    for (const ticket of tickets ?? []) {
      const entry = counts[ticket.artist_id] ?? { total: 0, open: 0 }
      entry.total += 1
      if (ticket.status === 'Open') entry.open += 1
      counts[ticket.artist_id] = entry
    }

    return counts
  }, [tickets])

  const filteredArtists = useMemo(() => {
    if (!artists) return []
    const query = artistSearch.trim().toLowerCase()
    if (!query) return artists
    return artists.filter(
      (artist) =>
        artist.name.toLowerCase().includes(query) ||
        String(artist.display_id).includes(query)
    )
  }, [artists, artistSearch])

  const filteredReleases = useMemo(() => {
    let list = releases ?? []
    if (releaseFilter !== 'All') {
      list = list.filter((r) => r.status === releaseFilter)
    }
    const query = releaseSearch.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.artist_name.toLowerCase().includes(query)
      )
    }
    return list
  }, [releases, releaseFilter, releaseSearch])

  const filteredTickets = useMemo(() => {
    if (ticketFilter === 'All') return tickets ?? []
    return (tickets ?? []).filter((t) => t.status === ticketFilter)
  }, [tickets, ticketFilter])

  const selectedArtist = artists?.find((a) => a.id === selectedArtistId) ?? null

  const selectedArtistReleases = useMemo(
    () => (releases ?? []).filter((r) => r.artist_id === selectedArtistId),
    [releases, selectedArtistId]
  )

  const selectedArtistTickets = useMemo(
    () => (tickets ?? []).filter((t) => t.artist_id === selectedArtistId),
    [tickets, selectedArtistId]
  )

  function handleGateSuccess(code: string) {
    setStorageItem('sessionStorage', PASSCODE_KEY, code)
  }

  function handleSignOut() {
    removeStorageItem('sessionStorage', PASSCODE_KEY)
    setArtists(null)
    setReleases(null)
    setTickets(null)
    setOverview(null)
    setActivityLogs(null)
    setAppSettings(null)
    setSelectedArtistId(null)
  }

  function handleReleaseChange(updatedRelease: ReleaseWithTracks) {
    setReleases((prev) =>
      prev ? prev.map((r) => (r.id === updatedRelease.id ? updatedRelease : r)) : prev
    )
  }

  function handleTicketStatusChange(ticketId: string, status: TicketStatus) {
    setTickets((prev) =>
      prev ? prev.map((t) => (t.id === ticketId ? { ...t, status } : t)) : prev
    )
  }

  function handleNewMessage(ticketId: string, message: TicketMessage) {
    setTickets((prev) =>
      prev
        ? prev.map((t) =>
            t.id === ticketId
              ? { ...t, messages: [...(t.messages ?? []), message] }
              : t
          )
        : prev
    )
  }

  function handleSelectArtist(artistId: string) {
    setSelectedArtistId((current) => (current === artistId ? null : artistId))
  }

  if (passcode === undefined) {
    return <div className="min-h-screen bg-paper" />
  }

  if (!passcode) {
    return <AdminGate onSuccess={handleGateSuccess} />
  }

  const isLoading = artists === null || releases === null || tickets === null

  const navCounts = {
    totalArtists: overview?.stats.totalArtists,
    pendingReleases: overview?.stats.pendingReleases,
    openTickets: overview?.stats.openTickets,
  }

  return (
    <AdminShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onSignOut={handleSignOut}
      counts={navCounts}
    >
      {error ? (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading workspace…" />
      ) : (
        <div key={activeTab} className="animate-fade-up">
          {/* ===== Overview ===== */}
          {activeTab === 'overview' ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
              {storageUsage ? (
                <div className="order-2 xl:order-none">
                  <StorageUsageMeter usage={storageUsage} />
                </div>
              ) : null}
              {overview ? (
                <AdminOverview
                  stats={overview.stats}
                  recentReleases={overview.recentReleases}
                />
              ) : (
                <LoadingState label="Loading overview…" />
              )}
            </div>
          ) : null}

          {/* ===== Artists ===== */}
          {activeTab === 'artists' ? (
            <div className="space-y-6">
              <SectionHeader
                title="Registered artists"
                icon={Users}
                count={artists.length}
                description="Every artist who has registered on the platform."
                actions={
                  <SearchInput
                    value={artistSearch}
                    onChange={setArtistSearch}
                    placeholder="Search by name or UID…"
                    label="Search artists"
                  />
                }
              />

              <ArtistRoster
                artists={filteredArtists}
                countsByArtistId={countsByArtistId}
                ticketCountsByArtistId={ticketCountsByArtistId}
                selectedArtistId={selectedArtistId}
                onSelectArtist={handleSelectArtist}
              />

              {selectedArtist ? (
                <ArtistDetailPanel
                  artist={selectedArtist}
                  releases={selectedArtistReleases}
                  counts={
                    countsByArtistId[selectedArtist.id] ?? {
                      total: 0, pending: 0, approved: 0, sent: 0, live: 0, rejected: 0,
                    }
                  }
                  tickets={selectedArtistTickets}
                  ticketCounts={
                    ticketCountsByArtistId[selectedArtist.id] ?? { total: 0, open: 0 }
                  }
                  passcode={passcode}
                  onReleaseChange={handleReleaseChange}
                  onTicketStatusChange={handleTicketStatusChange}
                  onNewMessage={handleNewMessage}
                  onClose={() => setSelectedArtistId(null)}
                />
              ) : null}
            </div>
          ) : null}

          {/* ===== Releases ===== */}
          {activeTab === 'releases' ? (
            <div className="space-y-6">
              <SectionHeader
                title="Releases"
                icon={Disc3}
                count={filteredReleases.length}
                description="Review, approve and distribute submitted releases."
                actions={
                  <SearchInput
                    value={releaseSearch}
                    onChange={setReleaseSearch}
                    placeholder="Search by title or artist…"
                    label="Search releases"
                  />
                }
              />

              <SegmentedControl
                label="Filter releases by status"
                value={releaseFilter}
                onChange={setReleaseFilter}
                options={RELEASE_FILTERS.map((filter) => ({ value: filter, label: filter }))}
              />

              <ReleaseManager
                releases={filteredReleases}
                passcode={passcode}
                onReleaseChange={handleReleaseChange}
                emptyMessage="No releases match this filter."
              />
            </div>
          ) : null}

          {/* ===== Tickets ===== */}
          {activeTab === 'tickets' ? (
            <div className="space-y-6">
              <SectionHeader
                title="Support tickets"
                icon={LifeBuoy}
                count={filteredTickets.length}
                description="Conversations with artists across the whole platform."
                actions={
                  <SegmentedControl
                    label="Filter tickets by status"
                    value={ticketFilter}
                    onChange={setTicketFilter}
                    options={TICKET_FILTERS.map((filter) => ({ value: filter, label: filter }))}
                  />
                }
              />

              <TicketsList
                tickets={filteredTickets}
                passcode={passcode}
                onStatusChange={handleTicketStatusChange}
                onNewMessage={handleNewMessage}
              />
            </div>
          ) : null}

          {/* ===== Activity ===== */}
          {activeTab === 'logs' ? (
            <div className="space-y-6">
              <SectionHeader
                title="Activity log"
                icon={Disc3}
                description="A chronological record of everything happening on the platform."
              />
              {activityLogs ? (
                <ActivityLogsPanel logs={activityLogs} />
              ) : (
                <LoadingState label="Loading logs…" />
              )}
            </div>
          ) : null}

          {/* ===== Settings ===== */}
          {activeTab === 'settings' ? (
            <div className="max-w-2xl space-y-6">
              <SectionHeader
                title="Admin settings"
                description="Control platform-wide configuration and maintenance mode."
              />
              {appSettings ? (
                <AdminSettingsPanel
                  settings={appSettings}
                  passcode={passcode}
                  onSaved={(updated) => setAppSettings(updated)}
                />
              ) : (
                <LoadingState label="Loading settings…" />
              )}
            </div>
          ) : null}
        </div>
      )}
    </AdminShell>
  )
}
