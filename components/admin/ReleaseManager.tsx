'use client'

import { useState, type ReactNode } from 'react'
import {
  Check,
  Download,
  Hourglass,
  Music2,
  Pencil,
  Radio,
  RotateCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import JSZip from 'jszip'
import type { ReleaseWithTracks } from '@/lib/types'
import {
  cn,
  formatDate,
  formatDateTime,
  formatDaysUntil,
  getDaysUntil,
  getFileExtension,
} from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/StatusBadge'

interface ReleaseManagerProps {
  releases: ReleaseWithTracks[]
  passcode: string
  onReleaseChange: (release: ReleaseWithTracks) => void
  emptyMessage?: string
}

type ActionMode =
  | { releaseId: string; type: 'reject' | 'changes' | 'live' | 'delete' }
  | null

const DELETION_WINDOWS = [24, 48] as const

export default function ReleaseManager({
  releases,
  passcode,
  onReleaseChange,
  emptyMessage = 'No releases yet.',
}: ReleaseManagerProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [actionMode, setActionMode] = useState<ActionMode>(null)
  const [reasonDraft, setReasonDraft] = useState('')
  const [linkDrafts, setLinkDrafts] = useState({ spotify: '', apple: '', youtube: '' })
  const [deletionHours, setDeletionHours] = useState<24 | 48>(24)

  const currentRelease = actionMode
    ? releases.find((r) => r.id === actionMode.releaseId) ?? null
    : null

  async function patchRelease(
    release: ReleaseWithTracks,
    body: Record<string, unknown>
  ): Promise<void> {
    setPendingId(release.id)
    setErrorId(null)

    try {
      const response = await fetch(`/api/admin/releases/${release.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error('Update failed')

      const result = await response.json()
      onReleaseChange(result.release as ReleaseWithTracks)
      setActionMode(null)
    } catch {
      setErrorId(release.id)
    } finally {
      setPendingId(null)
    }
  }

  function startReject(release: ReleaseWithTracks) {
    setReasonDraft(release.rejection_reason ?? '')
    setActionMode({ releaseId: release.id, type: 'reject' })
  }

  function startChanges(release: ReleaseWithTracks) {
    setReasonDraft(release.admin_note ?? '')
    setActionMode({ releaseId: release.id, type: 'changes' })
  }

  function startLive(release: ReleaseWithTracks) {
    setLinkDrafts({
      spotify: release.spotify_url ?? '',
      apple: release.apple_music_url ?? '',
      youtube: release.youtube_url ?? '',
    })
    setActionMode({ releaseId: release.id, type: 'live' })
  }

  function startDelete(release: ReleaseWithTracks) {
    setReasonDraft(release.deletion_reason ?? '')
    setDeletionHours(24)
    setActionMode({ releaseId: release.id, type: 'delete' })
  }

  async function confirmScheduleDeletion(release: ReleaseWithTracks) {
    setPendingId(release.id)
    setErrorId(null)

    try {
      const response = await fetch(`/api/admin/releases/${release.id}/schedule-deletion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-passcode': passcode,
        },
        body: JSON.stringify({ reason: reasonDraft, hours: deletionHours }),
      })

      if (!response.ok) throw new Error('Could not schedule deletion')

      const result = await response.json()
      onReleaseChange(result.release as ReleaseWithTracks)
      setActionMode(null)
    } catch {
      setErrorId(release.id)
    } finally {
      setPendingId(null)
    }
  }

  async function cancelScheduledDeletion(release: ReleaseWithTracks) {
    setPendingId(release.id)
    setErrorId(null)

    try {
      const response = await fetch(`/api/admin/releases/${release.id}/cancel-deletion`, {
        method: 'POST',
        headers: { 'x-admin-passcode': passcode },
      })

      if (!response.ok) throw new Error('Could not cancel deletion')

      const result = await response.json()
      onReleaseChange(result.release as ReleaseWithTracks)
      setActionMode(null)
    } catch {
      setErrorId(release.id)
    } finally {
      setPendingId(null)
    }
  }

  async function downloadZip(release: ReleaseWithTracks) {
    setDownloadingId(release.id)

    try {
      const zip = new JSZip()

      if (release.cover_art_url) {
        const response = await fetch(release.cover_art_url)
        const blob = await response.blob()
        const extension = getFileExtension(release.cover_art_url) || 'jpg'
        zip.file(`cover.${extension}`, blob)
      }

      for (const track of release.tracks) {
        const response = await fetch(track.audio_url)
        const blob = await response.blob()
        const extension = getFileExtension(track.audio_url) || 'mp3'
        zip.file(`${track.track_number} - ${track.song_title}.${extension}`, blob)
      }

      zip.file('release-details.txt', buildReleaseDetails(release))

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${release.title}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      setErrorId(release.id)
    } finally {
      setDownloadingId(null)
    }
  }

  function handleCloseModal() {
    setActionMode(null)
    setReasonDraft('')
  }

  if (releases.length === 0) {
    return (
      <EmptyState
        icon={Music2}
        title="No releases"
        message={emptyMessage}
      />
    )
  }

  const sorted = [...releases].sort((a, b) => {
    const aDays = getDaysUntil(a.release_date)
    const bDays = getDaysUntil(b.release_date)
    if (aDays === null) return 1
    if (bDays === null) return -1
    return aDays - bDays
  })

  return (
    <>
      <div className="flex flex-col gap-5">
        {sorted.map((release) => {
          const isPending = pendingId === release.id
          const isDownloading = downloadingId === release.id
          const days = getDaysUntil(release.release_date)
          const isUrgent =
            days !== null && days <= 3 && !['Live', 'Sent to Platforms'].includes(release.status)
          const isOverdue = days !== null && days < 0 && release.status !== 'Live'
          const hasScheduledDeletion = Boolean(release.scheduled_deletion_at)

          return (
            <Card key={release.id} className="overflow-hidden">
              <div className="flex flex-wrap items-start gap-4 p-5">
                {release.cover_art_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={release.cover_art_url}
                    alt={release.title}
                    className="h-20 w-20 shrink-0 rounded-md border-[2.5px] border-ink object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border-[2.5px] border-ink bg-paper">
                    <Music2 className="h-7 w-7 text-ink-faint" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg uppercase tracking-tight text-ink">{release.title}</p>
                    <Badge variant="neutral">
                      {release.release_type}
                    </Badge>
                    <StatusBadge status={release.status} />
                    {days !== null ? (
                      <Badge variant={isOverdue ? 'punch' : isUrgent ? 'canary' : 'neutral'}>
                        {formatDaysUntil(days)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                    {release.artist_name} · Release date: {formatDate(release.release_date)}
                    {release.language ? <> · {release.language}</> : null}
                  </p>
                  {release.copyright ? (
                    <p className="mt-0.5 font-mono text-[10px] font-medium text-ink-faint">
                      {release.copyright}
                    </p>
                  ) : null}

                  <ReleaseMetadata release={release} />

                  <ul className="mt-3 flex flex-col gap-2">
                    {release.tracks.map((track) => (
                      <li key={track.id} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-ink">
                            {track.track_number}. {track.song_title}
                          </span>
                          {track.genre ? <span className="text-ink-faint">{track.genre}</span> : null}
                          {track.explicit ? (
                            <Badge variant="punch" className="!text-[8px] !px-1.5 !py-0">
                              E
                            </Badge>
                          ) : null}
                          <audio controls src={track.audio_url} className="h-8 w-44" />
                        </div>
                        {track.lyrics ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint hover:text-ink">
                              Lyrics
                            </summary>
                            <p className="mt-1 whitespace-pre-wrap rounded-md border-2 border-ink/20 bg-paper px-3 py-2 text-sm font-medium text-ink-soft">
                              {track.lyrics}
                            </p>
                          </details>
                        ) : null}
                        <TrackMetadata track={track} />
                      </li>
                    ))}
                  </ul>

                  {release.status === 'Needs Changes' && release.admin_note ? (
                    <div className="mt-3 rounded-md border-2 border-ink bg-canary/20 px-3 py-2 text-sm font-medium text-ink">
                      <span className="font-bold">Changes requested: </span>
                      {release.admin_note}
                    </div>
                  ) : null}

                  {release.status === 'Rejected' && release.rejection_reason ? (
                    <div className="mt-3 rounded-md border-2 border-ink bg-punch/10 px-3 py-2 text-sm font-medium text-ink">
                      <span className="font-bold text-punch">Reason given: </span>
                      {release.rejection_reason}
                    </div>
                  ) : null}

                  {hasScheduledDeletion ? (
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-md border-2 border-ink bg-punch px-3 py-2.5 text-white">
                      <p className="flex items-start gap-2 text-sm font-bold">
                        <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Scheduled for deletion on{' '}
                          {formatDateTime(release.scheduled_deletion_at)}.
                          {release.deletion_reason ? <> Reason: {release.deletion_reason}</> : null}
                        </span>
                      </p>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => cancelScheduledDeletion(release)}
                        className="brutal-press flex shrink-0 items-center gap-1.5 rounded-md border-2 border-ink bg-white px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors disabled:opacity-40"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Cancel deletion
                      </button>
                    </div>
                  ) : null}

                  {errorId === release.id ? (
                    <p className="mt-2 font-mono text-[10px] font-bold text-punch">Action failed</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionPill
                      icon={Check}
                      label="Approve"
                      fill="bg-lime text-ink"
                      disabled={isPending || release.status === 'Approved'}
                      onClick={() => patchRelease(release, { status: 'Approved' })}
                    />
                    <ActionPill
                      icon={X}
                      label="Reject"
                      fill="bg-punch text-white"
                      disabled={isPending}
                      onClick={() => startReject(release)}
                    />
                    <ActionPill
                      icon={Pencil}
                      label="Needs changes"
                      fill="bg-canary text-ink"
                      disabled={isPending || release.status === 'Needs Changes'}
                      onClick={() => startChanges(release)}
                    />
                    <ActionPill
                      icon={Send}
                      label="Mark sent"
                      fill="bg-cobalt text-white"
                      disabled={isPending || ['Sent to Platforms', 'Live'].includes(release.status)}
                      onClick={() => patchRelease(release, { status: 'Sent to Platforms' })}
                    />
                    <ActionPill
                      icon={Radio}
                      label="Mark live"
                      fill="bg-ink text-paper"
                      disabled={isPending}
                      onClick={() => startLive(release)}
                    />
                    <ActionPill
                      icon={Download}
                      label={isDownloading ? 'Zipping…' : 'Download ZIP'}
                      fill="bg-white text-ink"
                      disabled={isDownloading}
                      onClick={() => downloadZip(release)}
                    />
                    <ActionPill
                      icon={Trash2}
                      label={hasScheduledDeletion ? 'Edit deletion' : 'Delete'}
                      fill="bg-white text-ink"
                      disabled={isPending}
                      onClick={() => startDelete(release)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ===== Modal-based action forms ===== */}

      <RejectModal
        open={actionMode?.type === 'reject' && actionMode?.releaseId === currentRelease?.id}
        release={currentRelease}
        reason={reasonDraft}
        onReasonChange={setReasonDraft}
        isPending={pendingId === currentRelease?.id}
        onClose={handleCloseModal}
        onConfirm={() => currentRelease && patchRelease(currentRelease, { status: 'Rejected', rejection_reason: reasonDraft })}
      />

      <ChangesModal
        open={actionMode?.type === 'changes' && actionMode?.releaseId === currentRelease?.id}
        release={currentRelease}
        reason={reasonDraft}
        onReasonChange={setReasonDraft}
        isPending={pendingId === currentRelease?.id}
        onClose={handleCloseModal}
        onConfirm={() => currentRelease && patchRelease(currentRelease, { status: 'Needs Changes', admin_note: reasonDraft })}
      />

      <LiveModal
        open={actionMode?.type === 'live' && actionMode?.releaseId === currentRelease?.id}
        release={currentRelease}
        links={linkDrafts}
        onLinksChange={setLinkDrafts}
        isPending={pendingId === currentRelease?.id}
        onClose={handleCloseModal}
        onConfirm={() => currentRelease && patchRelease(currentRelease, {
          status: 'Live',
          spotify_url: linkDrafts.spotify.trim() || null,
          apple_music_url: linkDrafts.apple.trim() || null,
          youtube_url: linkDrafts.youtube.trim() || null,
        })}
      />

      <DeleteModal
        open={actionMode?.type === 'delete' && actionMode?.releaseId === currentRelease?.id}
        release={currentRelease}
        reason={reasonDraft}
        onReasonChange={setReasonDraft}
        deletionHours={deletionHours}
        onDeletionHoursChange={setDeletionHours}
        isPending={pendingId === currentRelease?.id}
        onClose={handleCloseModal}
        onConfirm={() => currentRelease && confirmScheduleDeletion(currentRelease)}
      />
    </>
  )
}

/* ================================================================
   Sub-components & helpers (pure, no hooks)
   ================================================================ */

interface ReasonModalProps {
  open: boolean
  release: ReleaseWithTracks | null
  reason: string
  onReasonChange: (v: string) => void
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

function RejectModal({ open, release, reason, onReasonChange, isPending, onClose, onConfirm }: ReasonModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject release"
      description={release ? `Reject "${release.title}" and provide a reason to the artist.` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" isLoading={isPending} disabled={isPending || !reason.trim()} onClick={onConfirm}>
            Confirm reject
          </Button>
        </>
      }
    >
      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
        Why is this being rejected?
      </label>
      <textarea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="e.g. Audio quality is too low, please re-upload."
        className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
      />
    </Modal>
  )
}

function ChangesModal({ open, release, reason, onReasonChange, isPending, onClose, onConfirm }: ReasonModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request changes"
      description={release ? `Tell the artist what needs fixing on "${release.title}".` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button isLoading={isPending} disabled={isPending || !reason.trim()} onClick={onConfirm}>
            Request changes
          </Button>
        </>
      }
    >
      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
        What should the artist change?
      </label>
      <textarea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="e.g. Cover art has a typo — fix and resubmit."
        className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
      />
    </Modal>
  )
}

function LiveModal({
  open,
  release,
  links,
  onLinksChange,
  isPending,
  onClose,
  onConfirm,
}: {
  open: boolean
  release: ReleaseWithTracks | null
  links: { spotify: string; apple: string; youtube: string }
  onLinksChange: (v: { spotify: string; apple: string; youtube: string }) => void
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark as live"
      description={release ? `Add live links for "${release.title}". All fields are optional.` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button isLoading={isPending} disabled={isPending} onClick={onConfirm}>
            Confirm live
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <input
          value={links.spotify}
          onChange={(e) => onLinksChange({ ...links, spotify: e.target.value })}
          placeholder="Spotify URL"
          className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
        />
        <input
          value={links.apple}
          onChange={(e) => onLinksChange({ ...links, apple: e.target.value })}
          placeholder="Apple Music URL"
          className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
        />
        <input
          value={links.youtube}
          onChange={(e) => onLinksChange({ ...links, youtube: e.target.value })}
          placeholder="YouTube URL"
          className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
        />
      </div>
    </Modal>
  )
}

function DeleteModal({
  open,
  release,
  reason,
  onReasonChange,
  deletionHours,
  onDeletionHoursChange,
  isPending,
  onClose,
  onConfirm,
}: {
  open: boolean
  release: ReleaseWithTracks | null
  reason: string
  onReasonChange: (v: string) => void
  deletionHours: 24 | 48
  onDeletionHoursChange: (v: 24 | 48) => void
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule deletion"
      description={release ? `Schedule "${release.title}" for removal.` : ''}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" isLoading={isPending} disabled={isPending || !reason.trim()} onClick={onConfirm}>
            Schedule deletion
          </Button>
        </>
      }
    >
      <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
        Why is this being deleted?
      </label>
      <textarea
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="e.g. Duplicate submission, removing the older one."
        className="w-full rounded-lg border-[2.5px] border-ink bg-paper px-3 py-2 text-sm font-medium text-ink placeholder:text-ink-faint transition-shadow focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
      />
      <p className="mb-1.5 mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink">
        Remove after
      </p>
      <div className="flex gap-2">
        {DELETION_WINDOWS.map((hours) => (
          <button
            key={hours}
            type="button"
            onClick={() => onDeletionHoursChange(hours)}
            className={cn(
              'brutal-press flex-1 rounded-md border-2 border-ink px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.08em] transition-colors',
              deletionHours === hours ? 'bg-ink text-paper' : 'bg-white text-ink'
            )}
          >
            {hours} hours
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-ink-faint">
        The release stays visible (with this reason shown to the artist) until the
        deadline passes — it doesn&apos;t delete instantly.
      </p>
    </Modal>
  )
}

function ReleaseMetadata({ release }: { release: ReleaseWithTracks }) {
  const featuringArtists = (release.featuring_artists || '')
    .split(',')
    .map((artist) => artist.trim())
    .filter(Boolean)
  const featuringUrls = (release.featuring_artist_spotify_urls || '')
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
  const features = Array.from({ length: Math.max(featuringArtists.length, featuringUrls.length) }, (_, index) => ({
    artist: featuringArtists[index],
    url: featuringUrls[index],
  }))
  const genre = [release.primary_genre, release.secondary_genre].filter(Boolean).join(' / ')
  const hasMetadata = Boolean(
    release.version || release.original_release_date || genre || release.record_label ||
    release.primary_artist_spotify_url || release.distribution_platforms?.length || features.length
  )

  if (!hasMetadata) return null

  return (
    <details className="mt-3 rounded-md border-2 border-ink bg-paper">
      <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink hover:bg-paper">
        Submission details
      </summary>
      <dl className="grid gap-x-5 gap-y-3 border-t-2 border-ink p-3 text-sm sm:grid-cols-2">
        <MetadataItem label="Release version">{release.version}</MetadataItem>
        <MetadataItem label="Original release date">
          {release.original_release_date ? formatDate(release.original_release_date) : null}
        </MetadataItem>
        <MetadataItem label="Genres">{genre || null}</MetadataItem>
        <MetadataItem label="Record label">{release.record_label}</MetadataItem>
        <MetadataItem label="Distribution platforms">
          {release.distribution_platforms?.join(', ') || null}
        </MetadataItem>
        <MetadataItem label="Primary artist Spotify">
          {release.primary_artist_spotify_url ? <ExternalLink href={release.primary_artist_spotify_url} /> : null}
        </MetadataItem>
        {features.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">Featuring artists</dt>
            <dd className="mt-1 flex flex-wrap gap-2 text-ink">
              {features.map((feature, index) => (
                <span key={`${feature.artist}-${feature.url}-${index}`} className="rounded border-2 border-ink bg-white px-2 py-1 text-xs font-semibold">
                  {feature.artist || 'Unnamed artist'}
                  {feature.url ? <> · <ExternalLink href={feature.url} /></> : null}
                </span>
              ))}
            </dd>
          </div>
        ) : null}
      </dl>
    </details>
  )
}

function TrackMetadata({ track }: { track: ReleaseWithTracks['tracks'][number] }) {
  const credits = [
    ['Version', track.version],
    ['Duration', typeof track.duration === 'number' ? formatDuration(track.duration) : null],
    ['ISRC', track.isrc],
    ['Language', track.language],
    ['Featuring artists', track.featuring_artists],
    ['Songwriter(s)', track.songwriter],
    ['Composer(s)', track.composer],
    ['Producer(s)', track.producer],
  ] as const
  const hasDetails = track.instrumental || credits.some(([, value]) => Boolean(value))

  if (!hasDetails) return null

  return (
    <details className="mt-2 rounded-md border-2 border-ink/20 bg-paper px-3 py-2">
      <summary className="cursor-pointer font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint hover:text-ink">
        Track details
      </summary>
      <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {credits.map(([label, value]) => <MetadataItem key={label} label={label}>{value}</MetadataItem>)}
        {track.instrumental ? <MetadataItem label="Instrumental">Yes</MetadataItem> : null}
      </dl>
    </details>
  )
}

function MetadataItem({ label, children }: { label: string; children: ReactNode }) {
  if (!children) return null
  return (
    <div>
      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words font-medium text-ink">{children}</dd>
    </div>
  )
}

function ExternalLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-cobalt underline underline-offset-2 hover:text-cobalt-deep">
      Open profile
    </a>
  )
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
}

function buildReleaseDetails(release: ReleaseWithTracks) {
  const featuringArtists = (release.featuring_artists || '')
    .split(',')
    .map((artist) => artist.trim())
    .filter(Boolean)
  const featuringUrls = (release.featuring_artist_spotify_urls || '')
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
  const releaseFeatures = Array.from(
    { length: Math.max(featuringArtists.length, featuringUrls.length) },
    (_, index) => `${featuringArtists[index] || 'Unnamed artist'}${featuringUrls[index] ? ` — ${featuringUrls[index]}` : ''}`
  )
  const value = (item: string | number | null | undefined) => item === null || item === undefined || item === '' ? 'Not provided' : String(item)
  const lines = [
    'SPILRIX DISTRIBUTION — RELEASE DETAILS',
    '=======================================',
    '',
    'RELEASE',
    `Title: ${release.title}`,
    `Version: ${value(release.version)}`,
    `Release type: ${release.release_type}`,
    `Status: ${release.status}`,
    `Primary artist: ${release.artist_name}`,
    `Primary artist Spotify: ${value(release.primary_artist_spotify_url)}`,
    `Featuring artist(s): ${releaseFeatures.length ? releaseFeatures.join('; ') : 'None'}`,
    `Release date: ${value(release.release_date)}`,
    `Original release date: ${value(release.original_release_date)}`,
    `Primary genre: ${value(release.primary_genre)}`,
    `Secondary genre: ${value(release.secondary_genre)}`,
    `Language: ${value(release.language)}`,
    `Record label: ${value(release.record_label)}`,
    `Distribution platforms: ${release.distribution_platforms?.length ? release.distribution_platforms.join(', ') : 'Not provided'}`,
    `Cover art URL: ${value(release.cover_art_url)}`,
    `Copyright: ${value(release.copyright)}`,
    '',
    'TRACKS',
    '------',
    ...release.tracks.flatMap((track) => [
      '',
      `Track ${track.track_number}: ${track.song_title}`,
      `Version: ${value(track.version)}`,
      `Genre: ${value(track.genre)}`,
      `Audio file URL: ${value(track.audio_url)}`,
      `Duration: ${typeof track.duration === 'number' ? formatDuration(track.duration) : 'Not provided'}`,
      `ISRC: ${value(track.isrc)}`,
      `Language: ${value(track.language)}`,
      `Explicit content: ${track.explicit ? 'Yes' : 'No'}`,
      `Instrumental: ${track.instrumental ? 'Yes' : 'No'}`,
      `Featuring artist(s): ${value(track.featuring_artists)}`,
      `Songwriter(s): ${value(track.songwriter)}`,
      `Composer(s): ${value(track.composer)}`,
      `Producer(s): ${value(track.producer)}`,
      `Lyrics: ${track.lyrics ? `\n${track.lyrics}` : 'Not provided'}`,
    ]),
    '',
    `Exported from Spilrix on ${new Date().toLocaleString()}`,
  ]

  return lines.join('\n')
}

function ActionPill({
  icon: Icon,
  label,
  fill,
  disabled,
  onClick,
}: {
  icon: typeof Check
  label: string
  fill: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'brutal-press flex items-center gap-1.5 rounded-md border-[2.5px] border-ink px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] shadow-[2px_2px_0_0_var(--color-ink)] transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        fill
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
