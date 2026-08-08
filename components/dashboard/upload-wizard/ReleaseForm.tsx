'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Music2, Plus, Trash2, UploadCloud } from 'lucide-react'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getFileExtension, slugify } from '@/lib/utils'
import type { AppSettings, ReleaseType, ReleaseWithTracks } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'

const DEFAULT_SETTINGS: AppSettings = {
  maintenance_mode: false,
  max_upload_mb: 50,
  allowed_image_formats: ['jpg', 'jpeg', 'png', 'webp'],
  allowed_audio_formats: ['mp3', 'wav', 'flac', 'aac', 'ogg'],
}

const GENRES = [
  'Afrobeats',
  'Amapiano',
  'Hip-Hop / Rap',
  'R&B / Soul',
  'Pop',
  'Dance / Electronic',
  'Reggae / Dancehall',
  'Gospel',
  'Rock / Alternative',
  'Other',
]

const LANGUAGES = [
  'English',
  'Hindi',
  'Punjabi',
  'Bhojpuri',
  'Tamil',
  'Telugu',
  'Marathi',
  'Bengali',
  'Haryanvi',
  'Rajasthani',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Urdu',
  'Spanish',
  'French',
  'Instrumental (no language)',
  'Other',
]

const RELEASE_TYPES: ReleaseType[] = ['Single', 'EP', 'Album']

// Light industry-style rules so an "EP" with one song can't be submitted.
const MIN_TRACKS: Record<ReleaseType, number> = { Single: 1, EP: 2, Album: 5 }

interface TrackFormState {
  key: string
  songTitle: string
  genre: string
  explicit: boolean
  songwriter: string
  lyrics: string
  audioFile: File | null
  existingAudioUrl: string | null
}

function makeKey() {
  return Math.random().toString(36).slice(2)
}

function emptyTrack(): TrackFormState {
  return {
    key: makeKey(),
    songTitle: '',
    genre: GENRES[0],
    explicit: false,
    songwriter: '',
    lyrics: '',
    audioFile: null,
    existingAudioUrl: null,
  }
}

interface ReleaseFormProps {
  mode: 'create' | 'edit'
  initialRelease?: ReleaseWithTracks
  onSuccess: () => void
  onCancel?: () => void
}

export default function ReleaseForm({
  mode,
  initialRelease,
  onSuccess,
  onCancel,
}: ReleaseFormProps) {
  const { artist } = useArtistSession()
  const coverInputRef = useRef<HTMLInputElement>(null)

  const [releaseType, setReleaseType] = useState<ReleaseType>(
    initialRelease?.release_type ?? 'Single'
  )
  const [title, setTitle] = useState(initialRelease?.title ?? '')
  const [releaseDate, setReleaseDate] = useState(initialRelease?.release_date ?? '')
  const [language, setLanguage] = useState(initialRelease?.language ?? LANGUAGES[0])
  const [copyrightLine, setCopyrightLine] = useState(initialRelease?.copyright ?? '')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(
    initialRelease?.cover_art_url ?? null
  )
  const [tracks, setTracks] = useState<TrackFormState[]>(
    initialRelease?.tracks?.length
      ? initialRelease.tracks.map((track) => ({
          key: makeKey(),
          songTitle: track.song_title,
          genre: track.genre ?? GENRES[0],
          explicit: track.explicit,
          songwriter: track.songwriter ?? '',
          lyrics: track.lyrics ?? '',
          audioFile: null,
          existingAudioUrl: track.audio_url,
        }))
      : [emptyTrack()]
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadSettings, setUploadSettings] = useState<Pick<
    AppSettings,
    'max_upload_mb' | 'allowed_image_formats' | 'allowed_audio_formats'
  >>(DEFAULT_SETTINGS)

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.max_upload_mb) {
          setUploadSettings({
            max_upload_mb: data.max_upload_mb,
            allowed_image_formats: data.allowed_image_formats ?? DEFAULT_SETTINGS.allowed_image_formats,
            allowed_audio_formats: data.allowed_audio_formats ?? DEFAULT_SETTINGS.allowed_audio_formats,
          })
        }
      })
      .catch(() => {/* use defaults on failure */})
  }, [])

  const isSingle = releaseType === 'Single'
  const initialStatus = initialRelease?.status

  function handleCoverChange(file: File | null) {
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : initialRelease?.cover_art_url ?? null)
  }

  function updateTrack(key: string, patch: Partial<TrackFormState>) {
    setTracks((prev) => prev.map((track) => (track.key === key ? { ...track, ...patch } : track)))
  }

  function addTrack() {
    setTracks((prev) => [...prev, emptyTrack()])
  }

  function removeTrack(key: string) {
    setTracks((prev) => (prev.length > 1 ? prev.filter((track) => track.key !== key) : prev))
  }

  function handleReleaseTypeChange(nextType: ReleaseType) {
    setReleaseType(nextType)
    if (nextType === 'Single' && tracks.length > 1) {
      setTracks((prev) => prev.slice(0, 1))
    }
  }

  async function performSave(targetStatus?: 'Draft' | 'Pending Review') {
    setError(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setError('Give your release a title.')
      return
    }

    // Only enforce the track-count minimum on real submissions — drafts can
    // be saved half-finished.
    if (targetStatus !== 'Draft' && tracks.length < MIN_TRACKS[releaseType]) {
      setError(
        `A${releaseType === 'EP' ? 'n' : ''} ${releaseType} needs at least ${MIN_TRACKS[releaseType]} tracks.`
      )
      return
    }

    const maxBytes = uploadSettings.max_upload_mb * 1024 * 1024

    // Validate cover art
    if (coverFile) {
      const ext = getFileExtension(coverFile.name)
      if (!uploadSettings.allowed_image_formats.includes(ext)) {
        setError(
          `Cover art must be one of: ${uploadSettings.allowed_image_formats.join(', ')}. Got: .${ext}`
        )
        return
      }
      if (coverFile.size > maxBytes) {
        setError(
          `Cover art is too large (${(coverFile.size / 1024 / 1024).toFixed(1)} MB). Max allowed: ${uploadSettings.max_upload_mb} MB.`
        )
        return
      }
    }

    for (const track of tracks) {
      if (!track.songTitle.trim()) {
        setError('Every track needs a song title.')
        return
      }
      if (!track.audioFile && !track.existingAudioUrl) {
        setError('Every track needs an audio file.')
        return
      }
      if (track.audioFile) {
        const ext = getFileExtension(track.audioFile.name)
        if (!uploadSettings.allowed_audio_formats.includes(ext)) {
          setError(
            `"${track.songTitle}" — audio must be one of: ${uploadSettings.allowed_audio_formats.join(', ')}. Got: .${ext}`
          )
          return
        }
        if (track.audioFile.size > maxBytes) {
          setError(
            `"${track.songTitle}" — audio is too large (${(track.audioFile.size / 1024 / 1024).toFixed(1)} MB). Max allowed: ${uploadSettings.max_upload_mb} MB.`
          )
          return
        }
      }
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()

      let coverArtUrl = initialRelease?.cover_art_url ?? null
      if (coverFile) {
        setUploadProgress('Uploading cover art…')
        const extension = getFileExtension(coverFile.name) || 'jpg'
        const path = `${artist.id}/${Date.now()}-${slugify(trimmedTitle)}-cover.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('covers')
          .upload(path, coverFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        coverArtUrl = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
      }

      const totalUploads = tracks.filter((t) => t.audioFile).length
      let uploadsDone = 0
      if (totalUploads > 0) {
        setUploadProgress(`Uploading tracks… 0/${totalUploads}`)
      }

      const trackPayloads = await Promise.all(
        tracks.map(async (track) => {
          let audioUrl = track.existingAudioUrl

          if (track.audioFile) {
            const extension = getFileExtension(track.audioFile.name) || 'mp3'
            const path = `${artist.id}/${Date.now()}-${slugify(track.songTitle)}.${extension}`
            const { error: uploadError } = await supabase.storage
              .from('songs')
              .upload(path, track.audioFile, { cacheControl: '3600', upsert: false })
            if (uploadError) throw new Error(uploadError.message)
            audioUrl = supabase.storage.from('songs').getPublicUrl(path).data.publicUrl
            uploadsDone += 1
            setUploadProgress(`Uploading tracks… ${uploadsDone}/${totalUploads}`)
          }

          return {
            song_title: track.songTitle.trim(),
            genre: track.genre,
            audio_url: audioUrl,
            explicit: track.explicit,
            songwriter: track.songwriter.trim() || null,
            lyrics: track.lyrics.trim() || null,
          }
        })
      )

      setUploadProgress('Saving release…')

      const payload = {
        artist_id: artist.id,
        artist_name: artist.name,
        title: trimmedTitle,
        release_type: releaseType,
        cover_art_url: coverArtUrl,
        release_date: releaseDate || null,
        language: language || null,
        copyright: copyrightLine.trim() || null,
        tracks: trackPayloads,
        ...(targetStatus ? { status: targetStatus } : {}),
      }

      const endpoint = mode === 'create' ? '/api/releases' : `/api/releases/${initialRelease!.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error ?? 'Could not save the release.')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setIsSubmitting(false)
      setUploadProgress(null)
    }
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const primaryStatus =
      mode === 'create' || initialStatus === 'Draft' ? 'Pending Review' : undefined
    performSave(primaryStatus)
  }

  const showDraftButton = mode === 'create' || initialStatus === 'Draft'
  const primaryLabel =
    mode === 'create'
      ? 'Submit for review'
      : initialStatus === 'Draft'
        ? 'Save & submit'
        : initialStatus === 'Rejected' || initialStatus === 'Needs Changes'
          ? 'Resubmit for review'
          : 'Save changes'

  return (
    <Card className="p-6 md:p-8">
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-8">
        <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
          <div>
            <p className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
              Cover art
            </p>
            <label
              htmlFor="cover-art"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer.files?.[0]
                if (file) handleCoverChange(file)
              }}
              className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-[3px] border-dashed border-ink bg-paper transition-colors hover:bg-canary/20"
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover art preview" className="h-full w-full object-cover" />
              ) : (
                <UploadCloud className="h-7 w-7 text-ink-faint" />
              )}
            </label>
            <input
              ref={coverInputRef}
              id="cover-art"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Select
                label="Release type"
                required
                value={releaseType}
                onChange={(e) => handleReleaseTypeChange(e.target.value as ReleaseType)}
              >
                {RELEASE_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Input
                label="Release date"
                type="date"
                required
                value={releaseDate ?? ''}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <Input
              label={releaseType === 'Single' ? 'Song title' : 'Release title'}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={releaseType === 'Single' ? 'e.g. Midnight in Lagos' : 'e.g. Late Nights EP'}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <Select
                label="Language"
                required
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
              <Input
                label="Copyright"
                hint="optional"
                value={copyrightLine}
                onChange={(e) => setCopyrightLine(e.target.value)}
                placeholder={`e.g. © ${new Date().getFullYear()} ${artist.name}`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
              {isSingle ? 'Track' : `Tracks (${tracks.length})`}
            </p>
            {!isSingle ? (
              <button
                type="button"
                onClick={addTrack}
                className="brutal-press flex items-center gap-1.5 rounded-md border-[2.5px] border-ink bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink shadow-[2px_2px_0_0_var(--color-ink)] transition-colors hover:bg-canary"
              >
                <Plus className="h-3 w-3" />
                Add track
              </button>
            ) : null}
          </div>

          {tracks.map((track, index) => (
            <div
              key={track.key}
              className="rounded-lg border-[2.5px] border-ink bg-paper p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
                  Track {index + 1}
                </p>
                {!isSingle && tracks.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeTrack(track.key)}
                    aria-label="Remove track"
                    className="brutal-press flex h-7 w-7 items-center justify-center rounded-md border-2 border-ink bg-white text-ink transition-colors hover:bg-punch hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Song title"
                  required
                  value={track.songTitle}
                  onChange={(e) => updateTrack(track.key, { songTitle: e.target.value })}
                />
                <Select
                  label="Genre"
                  required
                  value={track.genre}
                  onChange={(e) => updateTrack(track.key, { genre: e.target.value })}
                >
                  {GENRES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Songwriter"
                  hint="optional"
                  value={track.songwriter}
                  onChange={(e) => updateTrack(track.key, { songwriter: e.target.value })}
                  placeholder="Who wrote it"
                />
                <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={track.explicit}
                    onChange={(e) => updateTrack(track.key, { explicit: e.target.checked })}
                    className="h-4 w-4 border-2 border-ink accent-punch"
                  />
                  Explicit content
                </label>
              </div>

              <div className="mt-4">
                <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Lyrics <span className="normal-case">(optional)</span>
                </label>
                <textarea
                  value={track.lyrics}
                  onChange={(e) => updateTrack(track.key, { lyrics: e.target.value })}
                  placeholder="Paste the lyrics here…"
                  rows={3}
                  className="w-full rounded-lg border-[2.5px] border-ink bg-white px-3.5 py-2.5 text-sm font-medium text-ink placeholder:text-ink-faint focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
                />
              </div>

              <div className="mt-4">
                <label
                  htmlFor={`audio-${track.key}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files?.[0]
                    if (file) updateTrack(track.key, { audioFile: file })
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border-[2.5px] border-dashed border-ink bg-white px-4 py-3 transition-colors hover:bg-canary/20"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-paper">
                    {track.audioFile || track.existingAudioUrl ? (
                      <Music2 className="h-4 w-4 text-cobalt" />
                    ) : (
                      <UploadCloud className="h-4 w-4 text-ink-soft" />
                    )}
                  </span>
                  <span className="text-sm font-medium text-ink">
                    {track.audioFile
                      ? track.audioFile.name
                      : track.existingAudioUrl
                        ? 'Replace audio file (optional)'
                        : 'Drag & drop or choose an audio file'}
                  </span>
                </label>
                {track.audioFile ? (
                  <audio
                    controls
                    preload="metadata"
                    src={URL.createObjectURL(track.audioFile)}
                    className="mt-2 h-8 w-full max-w-md"
                  />
                ) : null}
                <input
                  id={`audio-${track.key}`}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(e) =>
                    updateTrack(track.key, { audioFile: e.target.files?.[0] ?? null })
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
            {error}
          </p>
        ) : null}

        {uploadProgress ? (
          <p className="flex items-center gap-2 rounded-lg border-[2.5px] border-ink bg-canary px-4 py-3 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-[2.5px] border-current border-t-transparent" />
            {uploadProgress}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : primaryLabel}
          </Button>
          {showDraftButton ? (
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => performSave('Draft')}
            >
              Save as draft
            </Button>
          ) : null}
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
