'use client'

import { useEffect, useState } from 'react'
import {
  Copy,
  ExternalLink,
  Hourglass,
  Music2,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import ReleaseForm from '@/components/dashboard/ReleaseForm'
import ReleaseTimeline from '@/components/dashboard/ReleaseTimeline'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { ReleaseWithTracks } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import StatusBadge from '@/components/StatusBadge'

const EDITABLE_STATUSES = ['Draft', 'Pending Review', 'Needs Changes', 'Rejected']
const DELETABLE_STATUSES = ['Draft', 'Pending Review']

export default function StatusPage() {
  const { artist } = useArtistSession()
  const [releases, setReleases] = useState<ReleaseWithTracks[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  function loadReleases() {
    setIsLoading(true)
    setError(null)
    return fetch(`/api/releases?artist_id=${artist.id}`)
      .then((res) => res.json())
      .then((result) => setReleases(result.releases ?? []))
      .catch(() => setError('Could not load releases.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    let isMounted = true
    const refreshReleases = () => fetch(`/api/releases?artist_id=${artist.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (isMounted) setReleases(result.releases ?? [])
      })
      .catch(() => {
        if (isMounted) setError('Could not load releases.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    void refreshReleases()
    const refreshInterval = window.setInterval(() => void refreshReleases(), 5000)
    const onFocus = () => void refreshReleases()
    window.addEventListener('focus', onFocus)
    return () => { isMounted = false; window.clearInterval(refreshInterval); window.removeEventListener('focus', onFocus) }
  }, [artist.id])

  function handleEditSuccess() {
    setEditingId(null)
    loadReleases()
  }

  async function handleSubmitDraft(release: ReleaseWithTracks) {
    setBusyId(release.id)
    setError(null)

    try {
      const response = await fetch(`/api/releases/${release.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_id: artist.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not submit.')
      setReleases((prev) => prev.map((r) => (r.id === release.id ? result.release : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit for review.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDuplicate(release: ReleaseWithTracks) {
    setBusyId(release.id)
    setError(null)

    try {
      const response = await fetch(`/api/releases/${release.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_id: artist.id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not duplicate.')
      setReleases((prev) => [result.release, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate the release.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(release: ReleaseWithTracks) {
    const confirmed = window.confirm(`Delete "${release.title}"? This cannot be undone.`)
    if (!confirmed) return

    setBusyId(release.id)
    setError(null)

    try {
      const response = await fetch(
        `/api/releases/${release.id}?artist_id=${artist.id}`,
        { method: 'DELETE' }
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? 'Could not delete.')
      setReleases((prev) => prev.filter((r) => r.id !== release.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the release.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <header className="mb-8">
        <p className="inline-block -rotate-2 bg-cobalt px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          Catalog
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase text-ink">Submission status</h1>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          Every release you&apos;ve submitted (and every draft), and where it stands.
        </p>
      </header>

      {error ? (
        <p className="mb-6 rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
          Loading…
        </p>
      ) : releases.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="font-display text-lg uppercase text-ink">No submissions yet</p>
          <p className="mt-2 text-sm font-medium text-ink-soft">
            Upload your first release to see it tracked here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {releases.map((release) => {
            const isBusy = busyId === release.id
            const canEdit = EDITABLE_STATUSES.includes(release.status)
            const canDelete = DELETABLE_STATUSES.includes(release.status)

            return editingId === release.id ? (
              <div key={release.id}>
                <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                  Editing &ldquo;{release.title}&rdquo;
                </p>
                <ReleaseForm
                  mode="edit"
                  initialRelease={release}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
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
                      <p className="font-display text-lg uppercase text-ink">{release.title}</p>
                      <span className="rounded-md border-2 border-ink bg-paper px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-ink">
                        {release.release_type}
                      </span>
                      <StatusBadge status={release.status} />
                    </div>
                    <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                      Release date: {formatDate(release.release_date)}
                    </p>

                    <ReleaseTimeline status={release.status} />

                    <ul className="mt-3 flex flex-col gap-2">
                      {release.tracks.map((track) => (
                        <li key={track.id} className="text-sm font-medium text-ink-soft">
                          <p>
                            {track.track_number}. {track.song_title}
                            {track.genre ? (
                              <span className="text-ink-faint"> — {track.genre}</span>
                            ) : null}
                          </p>
                          {track.audio_url ? (
                            <audio
                              controls
                              preload="none"
                              src={track.audio_url}
                              className="mt-1 h-8 w-full max-w-md"
                            />
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {release.scheduled_deletion_at ? (
                      <p className="mt-3 flex items-start gap-2 rounded-md border-2 border-ink bg-punch px-3 py-2 text-sm font-bold text-white">
                        <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Scheduled for removal on {formatDateTime(release.scheduled_deletion_at)}.
                          {release.deletion_reason ? <> Reason: {release.deletion_reason}</> : null}
                        </span>
                      </p>
                    ) : null}

                    {release.status === 'Needs Changes' && release.admin_note ? (
                      <p className="mt-3 rounded-md border-2 border-ink bg-canary/20 px-3 py-2 text-sm font-medium text-ink">
                        <span className="font-bold">Changes requested: </span>
                        {release.admin_note}
                      </p>
                    ) : null}

                    {release.status === 'Rejected' && release.rejection_reason ? (
                      <p className="mt-3 rounded-md border-2 border-ink bg-punch/10 px-3 py-2 text-sm font-medium text-ink">
                        <span className="font-bold text-punch">Why: </span>
                        {release.rejection_reason}
                      </p>
                    ) : null}

                    {release.status === 'Live' ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {release.spotify_url ? (
                          <LiveLink href={release.spotify_url} label="Spotify" />
                        ) : null}
                        {release.apple_music_url ? (
                          <LiveLink href={release.apple_music_url} label="Apple Music" />
                        ) : null}
                        {release.youtube_url ? (
                          <LiveLink href={release.youtube_url} label="YouTube" />
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {release.status === 'Draft' ? (
                        <Button
                          type="button"
                          isLoading={isBusy}
                          disabled={isBusy}
                          onClick={() => handleSubmitDraft(release)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Submit for review
                        </Button>
                      ) : null}
                      {release.status === 'Rejected' || release.status === 'Needs Changes' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setEditingId(release.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {release.status === 'Rejected' ? 'Resubmit' : 'Fix & resubmit'}
                        </Button>
                      ) : null}
                      {canEdit &&
                      release.status !== 'Rejected' &&
                      release.status !== 'Needs Changes' ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditingId(release.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        isLoading={isBusy}
                        disabled={isBusy}
                        onClick={() => handleDuplicate(release)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </Button>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="danger"
                          isLoading={isBusy}
                          disabled={isBusy}
                          onClick={() => handleDelete(release)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LiveLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="brutal-press flex items-center gap-1.5 rounded-md border-[2.5px] border-ink bg-lime px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors hover:bg-lime-deep"
    >
      Listen on {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}
