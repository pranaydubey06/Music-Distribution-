'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import {
  type WizardState,
  type ReleaseInfoData,
  type CoverArtData,
  type PlatformData,
  type TrackData,
  type DraftData,
  DEFAULT_PLATFORMS,
  ADDITIONAL_PLATFORMS,
  RELEASE_TYPES,
  MIN_TRACKS_BY_TYPE,
  MAX_TRACKS_BY_TYPE,
  LANGUAGES,
  GENRES,
  COVER_ART_REQUIREMENTS,
  AUDIO_ALLOWED_TYPES,
  ISRC_REGEX,
  DRAFT_STORAGE_PREFIX,
  DRAFT_VERSION,
} from '../types'

function getLocalTodayIso() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

interface UseUploadWizardOptions {
  mode: 'create' | 'edit'
  artistId: string
  artistName: string
  existingRelease?: {
    release: { id?: string; release_type: string; title: string; version?: string; primary_artist_spotify_url?: string; featuring_artists?: string; featuring_artist_spotify_urls?: string; original_release_date?: string; primary_genre?: string; secondary_genre?: string; language?: string; record_label?: string; distribution_platforms?: string[]; cover_art_url?: string; release_date?: string }
    tracks: Array<{ id?: string; song_title: string; version?: string; audio_url?: string; duration?: number | null; isrc?: string; language?: string; explicit?: boolean; instrumental?: boolean; featuring_artists?: string; songwriter?: string; composer?: string; producer?: string; lyrics?: string }>
  }
  onSuccess?: (releaseId: string) => void
}

/**
 * Initial state factory
 */
function createInitialState(mode: 'create' | 'edit', artistId: string, artistName: string, existingRelease?: UseUploadWizardOptions['existingRelease']): WizardState {
  const releaseType = existingRelease?.release?.release_type || 'Single'
  const minTracks = MIN_TRACKS_BY_TYPE[releaseType as keyof typeof MIN_TRACKS_BY_TYPE] || 1

  const initialTracks: TrackData[] = existingRelease?.tracks
    ? existingRelease.tracks.map((t, idx) => ({
        key: `track-${t.id || idx}`,
        trackNumber: idx + 1,
        songTitle: t.song_title || '',
        version: t.version,
        audioFile: null,
        audioPreviewUrl: t.audio_url || null,
        duration: t.duration ?? null,
        isrc: t.isrc,
        language: t.language || 'English',
        explicit: t.explicit || false,
        instrumental: t.instrumental || false,
        featuringArtists: t.featuring_artists,
        songwriters: t.songwriter ? [t.songwriter] : [],
        composers: t.composer ? t.composer.split(',').map((name) => name.trim()).filter(Boolean) : [],
        producers: t.producer ? t.producer.split(',').map((name) => name.trim()).filter(Boolean) : [],
        lyrics: t.lyrics,
        validationErrors: [],
      }))
    : Array.from({ length: minTracks }, (_, i) => ({
        key: `track-${Date.now()}-${i}`,
        trackNumber: i + 1,
        songTitle: '',
        audioFile: null,
        audioPreviewUrl: null,
        duration: null,
        isrc: '',
        language: 'English',
        explicit: false,
        instrumental: false,
        featuringArtists: '',
        songwriters: [],
        composers: [],
        producers: [],
        lyrics: '',
        validationErrors: [],
      }))

  return {
    currentStep: 1,
    completedSteps: [],
    releaseInfo: {
      releaseType: releaseType as ReleaseInfoData['releaseType'],
      title: existingRelease?.release?.title || '',
      version: existingRelease?.release?.version,
      primaryArtist: artistName,
      primaryArtistSpotifyUrl: existingRelease?.release?.primary_artist_spotify_url || '',
      featuringArtists: existingRelease?.release?.featuring_artists || '',
      featuringArtistSpotifyUrls: existingRelease?.release?.featuring_artist_spotify_urls || '',
      releaseDate: existingRelease?.release?.release_date || new Date().toISOString().split('T')[0],
      originalReleaseDate: existingRelease?.release?.original_release_date,
      primaryGenre: existingRelease?.release?.primary_genre || 'Pop',
      secondaryGenre: existingRelease?.release?.secondary_genre,
      language: existingRelease?.release?.language || 'English',
      recordLabel: existingRelease?.release?.record_label,
    },
    coverArt: {
      file: null,
      previewUrl: existingRelease?.release?.cover_art_url || null,
      dimensions: null,
      validationError: null,
    },
    platforms: [
      ...DEFAULT_PLATFORMS.map((platform) => ({ ...platform, selected: true })),
      ...ADDITIONAL_PLATFORMS.map((platform) => ({
        ...platform,
        selected: existingRelease?.release?.distribution_platforms?.includes(platform.name) || false,
      })),
    ],
    tracks: initialTracks,
    isSubmitting: false,
    uploadProgress: null,
    audioMaxUploadMb: 50,
    validationErrors: {},
    draftId: null,
    lastSaved: null,
    mode,
    existingRelease: existingRelease?.release,
  }
}

/**
 * Main wizard state machine hook
 */
export function useUploadWizard({
  mode,
  artistId,
  artistName,
  existingRelease,
  onSuccess,
}: UseUploadWizardOptions) {
  const router = useRouter()
  const [state, setState] = useState<WizardState>(() => createInitialState(mode, artistId, artistName, existingRelease))
  const [showRestoreToast, setShowRestoreToast] = useState(false)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // =========================================================================
  // LocalStorage draft persistence
  // =========================================================================
  const draftKey = `${DRAFT_STORAGE_PREFIX}${artistId}_${mode === 'edit' ? existingRelease?.release?.id : 'new'}`

  const saveDraft = useCallback(
    (data: WizardState, immediate = false) => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)

      const doSave = () => {
        const draftData: DraftData = {
          wizardState: { ...data, lastSaved: Date.now() },
          version: DRAFT_VERSION,
          updatedAt: Date.now(),
        }
        try {
          localStorage.setItem(draftKey, JSON.stringify(draftData))
          setState((prev) => ({ ...prev, lastSaved: Date.now() }))
        } catch (e) {
          console.warn('Failed to save draft:', e)
        }
      }

      if (immediate) doSave()
      else autoSaveTimeoutRef.current = setTimeout(doSave, 2000)
    },
    [draftKey]
  )

  const loadDraft = useCallback((): WizardState | null => {
    try {
      const stored = localStorage.getItem(draftKey)
      if (!stored) return null
      const draft: DraftData = JSON.parse(stored)
      if (draft.version !== DRAFT_VERSION) return null
      return draft.wizardState
    } catch {
      return null
    }
  }, [draftKey])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey)
    } catch {
      // ignore
    }
  }, [draftKey])

  // Check for existing draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft && (mode === 'create' || !existingRelease)) {
      setShowRestoreToast(true)
      // Don't auto-restore - let user choose
    }
  }, [loadDraft, mode, existingRelease])

  // The artist-facing upload limit always follows the value configured in
  // Admin Settings. A 50 MB fallback keeps the form usable if settings are
  // temporarily unavailable.
  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((settings) => {
        if (typeof settings?.max_upload_mb === 'number' && settings.max_upload_mb > 0) {
          setState((prev) => ({ ...prev, audioMaxUploadMb: settings.max_upload_mb }))
        }
      })
      .catch(() => undefined)
  }, [])

  const restoreDraft = useCallback(() => {
    const draft = loadDraft()
    if (draft) {
      setState({ ...draft, audioMaxUploadMb: draft.audioMaxUploadMb || 50 })
      setShowRestoreToast(false)
    }
  }, [loadDraft])

  const dismissRestore = useCallback(() => {
    setShowRestoreToast(false)
    clearDraft()
  }, [clearDraft])

  // =========================================================================
  // Step validation
  // =========================================================================
  const validateStep = useCallback(function validateStep(step: number, currentState: WizardState): string[] {
    const errors: string[] = []

    switch (step) {
      case 1: {
        const { releaseInfo } = currentState
        if (!releaseInfo.releaseType) errors.push('Release type is required')
        if (!releaseInfo.title?.trim()) errors.push('Release title is required')
        if (!releaseInfo.primaryArtist?.trim()) errors.push('Primary artist is required')
        if (!releaseInfo.releaseDate) errors.push('Release date is required')
        // Date inputs produce YYYY-MM-DD values. Comparing those strings avoids
        // UTC parsing and timezone shifts that could mark today's date as past.
        else if (releaseInfo.releaseDate < getLocalTodayIso()) {
          errors.push('Release date cannot be in the past')
        }
        if (!releaseInfo.primaryGenre) errors.push('Primary genre is required')
        if (!releaseInfo.language) errors.push('Language is required')
        if (releaseInfo.primaryArtistSpotifyUrl && !/^https?:\/\/.+/.test(releaseInfo.primaryArtistSpotifyUrl)) {
          errors.push('Primary artist Spotify URL must be a valid URL')
        }
        break
      }
      case 2: {
        const { coverArt } = currentState
        if (!coverArt.file && !coverArt.previewUrl) {
          errors.push('Cover art is required')
        }
        if (coverArt.validationError) {
          errors.push(coverArt.validationError)
        }
        break
      }
      case 3: {
        const { platforms } = currentState
        if (!platforms.some(p => p.selected)) {
          errors.push('At least one distribution platform must be selected')
        }
        break
      }
      case 4: {
        const { tracks, releaseInfo } = currentState
        const minTracks = MIN_TRACKS_BY_TYPE[releaseInfo.releaseType] || 1
        if (tracks.length < minTracks) {
          errors.push(`Minimum ${minTracks} track(s) required for ${releaseInfo.releaseType}`)
        }
        tracks.forEach((track, idx) => {
          if (!track.songTitle?.trim()) {
            errors.push(`Track ${idx + 1}: Song title is required`)
          }
          if (!track.audioFile && !track.audioPreviewUrl) {
            errors.push(`Track ${idx + 1}: Audio file is required`)
          }
          if (track.isrc && !ISRC_REGEX.test(track.isrc)) {
            errors.push(`Track ${idx + 1}: Invalid ISRC format (use XX-XXX-YY-NNNNN)`)
          }
        })
        break
      }
      case 5: {
        // Step 5 validation runs all previous validations
        for (let s = 1; s <= 4; s++) {
          errors.push(...validateStep(s, currentState))
        }
        break
      }
    }

    return errors
  }, [])

  // =========================================================================
  // State updaters
  // =========================================================================
  const updateReleaseInfo = useCallback((patch: Partial<ReleaseInfoData>) => {
    setState((prev) => {
      const newReleaseInfo = { ...prev.releaseInfo, ...patch }

      // When release type changes, adjust track count
      if (patch.releaseType && patch.releaseType !== prev.releaseInfo.releaseType) {
        const minTracks = MIN_TRACKS_BY_TYPE[patch.releaseType] || 1
        const maxTracks = MAX_TRACKS_BY_TYPE[patch.releaseType] || 30
        let newTracks = [...prev.tracks]
        if (newTracks.length < minTracks) {
          const toAdd = minTracks - newTracks.length
          for (let i = 0; i < toAdd; i++) {
            newTracks.push({
              key: `track-${Date.now()}-${i}`,
              trackNumber: newTracks.length + i + 1,
              songTitle: '',
              version: '',
              audioFile: null,
              audioPreviewUrl: null,
              duration: null,
              isrc: '',
              language: 'English',
              explicit: false,
              instrumental: false,
              featuringArtists: '',
              songwriters: [],
              composers: [],
              producers: [],
              lyrics: '',
              validationErrors: [],
            })
          }
        } else if (newTracks.length > maxTracks) {
          newTracks = newTracks.slice(0, maxTracks)
        }
        // Renumber
        newTracks = newTracks.map((t, i) => ({ ...t, trackNumber: i + 1 }))
        return {
          ...prev,
          releaseInfo: newReleaseInfo,
          tracks: newTracks,
          validationErrors: { ...prev.validationErrors, 1: [] },
        }
      }

      return {
        ...prev,
        releaseInfo: newReleaseInfo,
        validationErrors: { ...prev.validationErrors, 1: [] },
      }
    })
  }, [])

  const updateCoverArt = useCallback((patch: Partial<CoverArtData>) => {
    setState((prev) => ({ ...prev, coverArt: { ...prev.coverArt, ...patch } }))
  }, [])

  const updatePlatforms = useCallback((patch: PlatformData[] | ((prev: PlatformData[]) => PlatformData[])) => {
    setState((prev) => ({
      ...prev,
      platforms: typeof patch === 'function' ? patch(prev.platforms) : patch,
    }))
  }, [])

  const updateTracks = useCallback((patch: TrackData[] | ((prev: TrackData[]) => TrackData[])) => {
    setState((prev) => ({
      ...prev,
      tracks: typeof patch === 'function' ? patch(prev.tracks) : patch,
    }))
  }, [])

  const addTrack = useCallback(() => {
    setState((prev) => {
      const maxTracks = MAX_TRACKS_BY_TYPE[prev.releaseInfo.releaseType] || 30
      if (prev.tracks.length >= maxTracks) return prev

      const newTrack: TrackData = {
        key: `track-${Date.now()}`,
        trackNumber: prev.tracks.length + 1,
        songTitle: '',
        version: '',
        audioFile: null,
        audioPreviewUrl: null,
        duration: null,
        isrc: '',
        language: 'English',
        explicit: false,
        instrumental: false,
        featuringArtists: '',
        songwriters: [],
        composers: [],
        producers: [],
        lyrics: '',
        validationErrors: [],
      }
      return { ...prev, tracks: [...prev.tracks, newTrack] }
    })
  }, [])

  const removeTrack = useCallback((key: string) => {
    setState((prev) => {
      const minTracks = MIN_TRACKS_BY_TYPE[prev.releaseInfo.releaseType] || 1
      if (prev.tracks.length <= minTracks) return prev

      const newTracks = prev.tracks
        .filter((t) => t.key !== key)
        .map((t, i) => ({ ...t, trackNumber: i + 1 }))
      return { ...prev, tracks: newTracks }
    })
  }, [])

  const reorderTracks = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newTracks = [...prev.tracks]
      const [removed] = newTracks.splice(fromIndex, 1)
      newTracks.splice(toIndex, 0, removed)
      return {
        ...prev,
        tracks: newTracks.map((t, i) => ({ ...t, trackNumber: i + 1 })),
      }
    })
  }, [])

  const updateTrack = useCallback((key: string, patch: Partial<TrackData>) => {
    setState((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.key === key ? { ...t, ...patch } : t)),
    }))
  }, [])

  // =========================================================================
  // Navigation
  // =========================================================================
  const goToStep = useCallback(
    (step: number) => {
      setState((prev) => {
        // Validate current step before leaving
        const errors = validateStep(prev.currentStep, prev)
        const newValidationErrors = { ...prev.validationErrors, [prev.currentStep]: errors }

        if (errors.length > 0 && step > prev.currentStep) {
          // Block forward navigation on validation failure
          return { ...prev, validationErrors: newValidationErrors }
        }

        const newCompletedSteps = [...new Set([...prev.completedSteps, prev.currentStep])]
        return {
          ...prev,
          currentStep: Math.max(1, Math.min(6, step)),
          completedSteps: newCompletedSteps,
          validationErrors: newValidationErrors,
        }
      })
    },
    [validateStep]
  )

  const nextStep = useCallback(() => {
    goToStep(state.currentStep + 1)
  }, [goToStep, state.currentStep])

  const prevStep = useCallback(() => {
    goToStep(state.currentStep - 1)
  }, [goToStep, state.currentStep])

  // =========================================================================
  // File handling
  // =========================================================================
  const handleCoverArtFile = useCallback(
    async (file: File) => {
      // Validate file type
      if (!(COVER_ART_REQUIREMENTS.allowedTypes as readonly string[]).includes(file.type)) {
        updateCoverArt({ validationError: 'File must be JPG or PNG' })
        return
      }

      // Validate file size
      if (file.size > COVER_ART_REQUIREMENTS.maxSizeMB * 1024 * 1024) {
        updateCoverArt({ validationError: `File size must be under ${COVER_ART_REQUIREMENTS.maxSizeMB} MB` })
        return
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file)

      // Validate dimensions
      const img = new Image()
      img.src = previewUrl
      await new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve()
      })

      const validationError =
        img.width !== COVER_ART_REQUIREMENTS.width || img.height !== COVER_ART_REQUIREMENTS.height
          ? `Cover art must be exactly ${COVER_ART_REQUIREMENTS.width} × ${COVER_ART_REQUIREMENTS.height} pixels`
          : null

      updateCoverArt({
        file,
        previewUrl,
        dimensions: { width: img.width, height: img.height },
        validationError,
      })
    },
    [updateCoverArt]
  )

  const removeCoverArt = useCallback(() => {
    setState((prev) => {
      if (prev.coverArt.previewUrl && !prev.coverArt.file) {
        // It's an existing URL, keep it but mark as removed
        return { ...prev, coverArt: { ...prev.coverArt, file: null, previewUrl: null, dimensions: null, validationError: null } }
      }
      return { ...prev, coverArt: { file: null, previewUrl: null, dimensions: null, validationError: null } }
    })
  }, [])

  const handleTrackAudioFile = useCallback(
    async (trackKey: string, file: File) => {
      const isWav = file.name.toLowerCase().endsWith('.wav') &&
        (!file.type || (AUDIO_ALLOWED_TYPES as readonly string[]).includes(file.type))
      if (!isWav) {
        updateTrack(trackKey, { validationErrors: ['Audio must be a WAV (.wav) file'] })
        return
      }

      const maxBytes = state.audioMaxUploadMb * 1024 * 1024
      if (file.size > maxBytes) {
        updateTrack(trackKey, { validationErrors: [`WAV file must be ${state.audioMaxUploadMb} MB or smaller`] })
        return
      }

      const previewUrl = URL.createObjectURL(file)

      // Try to get duration
      let duration: number | null = null
      try {
        const audio = new Audio(previewUrl)
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            duration = Math.round(audio.duration)
            resolve()
          }
          audio.onerror = () => resolve()
        })
      } catch {
        // Ignore duration detection errors
      }

      updateTrack(trackKey, {
        audioFile: file,
        audioPreviewUrl: previewUrl,
        duration,
        validationErrors: [],
      })
    },
    [state.audioMaxUploadMb, updateTrack]
  )

  const removeTrackAudio = useCallback(
    (trackKey: string) => {
      updateTrack(trackKey, {
        audioFile: null,
        audioPreviewUrl: null,
        duration: null,
      })
    },
    [updateTrack]
  )

  // =========================================================================
  // Submission
  // =========================================================================
  const saveDraftApi = useCallback(async (): Promise<string | null> => {
    setState((prev) => ({ ...prev, isSubmitting: true }))

    try {
      // Upload cover art first
      let coverArtUrl = state.coverArt.previewUrl
      if (state.coverArt.file) {
        // Upload via API route or direct to storage
        const supabase = getSupabaseBrowserClient()
        const ext = state.coverArt.file.name.split('.').pop() || 'jpg'
        const path = `covers/${artistId}/${slugify(state.releaseInfo.title)}-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('covers').upload(path, state.coverArt.file)
        if (error) throw new Error(error.message)
        const { data } = supabase.storage.from('covers').getPublicUrl(path)
        coverArtUrl = data.publicUrl
      }

      // Upload track audio files
      const trackUrls: string[] = []
      for (const track of state.tracks) {
        if (track.audioFile) {
          const supabase = getSupabaseBrowserClient()
          const ext = track.audioFile.name.split('.').pop() || 'mp3'
          const path = `songs/${artistId}/${slugify(state.releaseInfo.title)}/${slugify(track.songTitle)}-${Date.now()}.${ext}`
          const { error } = await supabase.storage.from('songs').upload(path, track.audioFile)
          if (error) throw new Error(error.message)
          const { data } = supabase.storage.from('songs').getPublicUrl(path)
          trackUrls.push(data.publicUrl)
        } else if (track.audioPreviewUrl) {
          trackUrls.push(track.audioPreviewUrl)
        } else {
          trackUrls.push('')
        }
      }

      // Prepare API payload
      const payload = {
        artist_id: artistId,
        artist_name: state.releaseInfo.primaryArtist,
        title: state.releaseInfo.title,
        release_type: state.releaseInfo.releaseType,
        cover_art_url: coverArtUrl,
        release_date: state.releaseInfo.releaseDate,
        language: state.releaseInfo.language,
        version: state.releaseInfo.version,
        original_release_date: state.releaseInfo.originalReleaseDate,
        primary_genre: state.releaseInfo.primaryGenre,
        secondary_genre: state.releaseInfo.secondaryGenre,
        record_label: state.releaseInfo.recordLabel,
        primary_artist_spotify_url: state.releaseInfo.primaryArtistSpotifyUrl,
        featuring_artists: state.releaseInfo.featuringArtists,
        featuring_artist_spotify_urls: state.releaseInfo.featuringArtistSpotifyUrls,
        distribution_platforms: state.platforms.filter((platform) => platform.selected).map((platform) => platform.name),
        status: 'Draft' as const,
        tracks: state.tracks.map((track, idx) => ({
          track_number: idx + 1,
          song_title: track.songTitle,
          version: track.version,
          genre: state.releaseInfo.primaryGenre,
          audio_url: trackUrls[idx],
          duration: track.duration,
          explicit: track.explicit,
          instrumental: track.instrumental,
          isrc: track.isrc,
          language: track.language,
          featuring_artists: track.featuringArtists,
          songwriter: track.songwriters.join(', '),
          composer: track.composers.join(', '),
          producer: track.producers.join(', '),
          lyrics: track.lyrics,
        })),
      }

      const endpoint = state.mode === 'edit' && state.existingRelease
        ? `/api/releases/${state.existingRelease.id}`
        : '/api/releases'

      const method = state.mode === 'edit' && state.existingRelease ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save draft')
      }

      const data = await res.json()
      const releaseId = data.release?.id || data.id

      // Save draft reference
      setState((prev) => ({ ...prev, draftId: releaseId }))
      clearDraft()

      return releaseId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save draft'
      setState((prev) => ({ ...prev, isSubmitting: false }))
      throw new Error(message)
    }
  }, [state, artistId, clearDraft])

  const submitRelease = useCallback(async (): Promise<boolean> => {
    // Run all validations first
    setState((prev) => {
      const allErrors: Record<number, string[]> = {}
      for (let s = 1; s <= 5; s++) {
        allErrors[s] = validateStep(s, prev)
      }
      return { ...prev, validationErrors: allErrors }
    })

    // Check if any errors
    // Re-validate with current state
    const currentErrors: Record<number, string[]> = {}
    for (let s = 1; s <= 5; s++) {
      currentErrors[s] = validateStep(s, state)
    }
    if (Object.values(currentErrors).some((e) => e.length > 0)) {
      return false
    }

    setState((prev) => ({ ...prev, isSubmitting: true, uploadProgress: { step: 'Preparing…', loaded: 0, total: 100 } }))

    try {
      // Upload cover art
      let coverArtUrl = state.coverArt.previewUrl
      if (state.coverArt.file) {
        setState((prev) => ({ ...prev, uploadProgress: { step: 'Uploading cover art…', loaded: 10, total: 100 } }))
        const supabase = getSupabaseBrowserClient()
        const ext = state.coverArt.file.name.split('.').pop() || 'jpg'
        const path = `covers/${artistId}/${slugify(state.releaseInfo.title)}-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('covers').upload(path, state.coverArt.file)
        if (error) throw new Error(error.message)
        const { data } = supabase.storage.from('covers').getPublicUrl(path)
        coverArtUrl = data.publicUrl
      }

      // Upload tracks
      const trackUrls: string[] = []
      for (let i = 0; i < state.tracks.length; i++) {
        const track = state.tracks[i]
        setState((prev) => ({
          ...prev,
          uploadProgress: { step: `Uploading track ${i + 1} of ${state.tracks.length}…`, loaded: 20 + (i / state.tracks.length) * 70, total: 100 },
        }))

        if (track.audioFile) {
          const supabase = getSupabaseBrowserClient()
          const ext = track.audioFile.name.split('.').pop() || 'mp3'
          const path = `songs/${artistId}/${slugify(state.releaseInfo.title)}/${slugify(track.songTitle)}-${Date.now()}.${ext}`
          const { error } = await supabase.storage.from('songs').upload(path, track.audioFile)
          if (error) throw new Error(error.message)
          const { data } = supabase.storage.from('songs').getPublicUrl(path)
          trackUrls.push(data.publicUrl)
        } else if (track.audioPreviewUrl) {
          trackUrls.push(track.audioPreviewUrl)
        } else {
          trackUrls.push('')
        }
      }

      // Submit to API
      setState((prev) => ({ ...prev, uploadProgress: { step: 'Submitting release…', loaded: 95, total: 100 } }))

      const payload = {
        artist_id: artistId,
        artist_name: state.releaseInfo.primaryArtist,
        title: state.releaseInfo.title,
        version: state.releaseInfo.version,
        release_type: state.releaseInfo.releaseType,
        cover_art_url: coverArtUrl,
        release_date: state.releaseInfo.releaseDate,
        original_release_date: state.releaseInfo.originalReleaseDate,
        primary_genre: state.releaseInfo.primaryGenre,
        secondary_genre: state.releaseInfo.secondaryGenre,
        language: state.releaseInfo.language,
        record_label: state.releaseInfo.recordLabel,
        featuring_artists: state.releaseInfo.featuringArtists,
        featuring_artist_spotify_urls: state.releaseInfo.featuringArtistSpotifyUrls,
        primary_artist_spotify_url: state.releaseInfo.primaryArtistSpotifyUrl,
        distribution_platforms: state.platforms
          .filter((platform) => platform.selected)
          .map((platform) => platform.name),
        status: 'Pending Review' as const,
        tracks: state.tracks.map((track, idx) => ({
          track_number: idx + 1,
          song_title: track.songTitle,
          version: track.version,
          genre: state.releaseInfo.primaryGenre,
          audio_url: trackUrls[idx],
          duration: track.duration,
          explicit: track.explicit,
          instrumental: track.instrumental,
          isrc: track.isrc,
          language: track.language,
          featuring_artists: track.featuringArtists,
          songwriter: track.songwriters.join(', '),
          composer: track.composers.join(', '),
          producer: track.producers.join(', '),
          lyrics: track.lyrics,
        })),
      }

      const endpoint = state.mode === 'edit' && state.existingRelease
        ? `/api/releases/${state.existingRelease.id}`
        : '/api/releases'

      const method = state.mode === 'edit' && state.existingRelease ? 'PATCH' : 'POST'

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit release')
      }

      const data = await res.json()
      const releaseId = data.release?.id || data.id

      clearDraft()
      setState((prev) => ({ ...prev, isSubmitting: false, uploadProgress: { step: 'Complete!', loaded: 100, total: 100 } }))

      if (onSuccess) onSuccess(releaseId)
      else router.push('/dashboard/status')

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit release'
      setState((prev) => ({ ...prev, isSubmitting: false, uploadProgress: null, validationErrors: { 6: [message] } }))
      return false
    }
  }, [state, artistId, router, onSuccess, validateStep, clearDraft])

  const saveDraftAction = useCallback(async (): Promise<boolean> => {
    try {
      await saveDraftApi()
      return true
    } catch {
      return false
    }
  }, [saveDraftApi])

  // =========================================================================
  // Auto-save on state change (debounced)
  // =========================================================================
  useEffect(() => {
    saveDraft(state)
  }, [state, saveDraft])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current)
    }
  }, [])

  // =========================================================================
  // Return API
  // =========================================================================
  return {
    state,
    // Draft
    showRestoreToast,
    restoreDraft,
    dismissRestore,
    // Navigation
    goToStep,
    nextStep,
    prevStep,
    // Updaters
    updateReleaseInfo,
    updateCoverArt,
    updatePlatforms,
    updateTracks,
    // Track management
    addTrack,
    removeTrack,
    reorderTracks,
    updateTrack,
    // File handlers
    handleCoverArtFile,
    removeCoverArt,
    handleTrackAudioFile,
    removeTrackAudio,
    // Actions
    saveDraft: saveDraftAction,
    submitRelease,
    // Validation
    validateStep: (step: number) => validateStep(step, state),
    // Constants
    RELEASE_TYPES,
    MIN_TRACKS_BY_TYPE,
    MAX_TRACKS_BY_TYPE,
    LANGUAGES,
    GENRES,
  }
}
