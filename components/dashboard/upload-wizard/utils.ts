/* ============================================================================
   Validation & utility helpers for the Upload Wizard
   ============================================================================ */

import type {
  ReleaseInfoData,
  CoverArtData,
  PlatformData,
  TrackData,
  ReleaseType,
  WizardState,
} from './types'

const MIN_TRACKS_BY_TYPE: Record<ReleaseType, number> = {
  Single: 1,
  EP: 2,
  Album: 5,
}

const MAX_TRACKS_BY_TYPE: Record<ReleaseType, number> = {
  Single: 1,
  EP: 6,
  Album: 30,
}

/**
 * Validate a single track's data
 */
export function validateTrack(track: TrackData): string[] {
  const errors: string[] = []

  if (!track.songTitle?.trim()) {
    errors.push('Track title is required')
  }

  if (!track.audioFile && !track.audioPreviewUrl) {
    errors.push('Audio file is required')
  }

  if (track.isrc && !/^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/.test(track.isrc)) {
    errors.push('ISRC must be in format: CC-XXX-YY-NNNNN (e.g., US-ABC-23-12345)')
  }

  if (!track.language?.trim()) {
    errors.push('Language is required')
  }

  // Validate tag arrays contain only non-empty strings
  for (const field of ['songwriters', 'composers', 'producers'] as const) {
    const arr = track[field]
    if (arr.length > 0) {
      const invalid = arr.some((s) => !s.trim())
      if (invalid) errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} cannot have empty entries`)
    }
  }

  return errors
}

/**
 * Validate release info step
 */
export function validateReleaseInfo(data: ReleaseInfoData): string[] {
  const errors: string[] = []

  if (!data.releaseType) errors.push('Release type is required')
  if (!data.title?.trim()) errors.push('Release title is required')
  if (!data.primaryArtist?.trim()) errors.push('Primary artist is required')
  if (!data.releaseDate) errors.push('Release date is required')
  if (!data.primaryGenre?.trim()) errors.push('Primary genre is required')
  if (!data.language?.trim()) errors.push('Language is required')

  // Validate URLs if provided
  if (data.primaryArtistSpotifyUrl && !isValidUrl(data.primaryArtistSpotifyUrl)) {
    errors.push('Primary artist Spotify URL is invalid')
  }
  if (data.featuringArtistSpotifyUrls) {
    const urls = data.featuringArtistSpotifyUrls.split(',').map((u) => u.trim()).filter(Boolean)
    for (const url of urls) {
      if (!isValidUrl(url)) errors.push(`Featuring artist Spotify URL is invalid: ${url}`)
    }
  }

  return errors
}

/**
 * Validate cover art
 */
export function validateCoverArt(data: CoverArtData): string[] {
  const errors: string[] = []

  if (!data.file && !data.previewUrl) {
    errors.push('Cover art is required')
    return errors
  }

  if (data.dimensions) {
    if (data.dimensions.width !== 3000 || data.dimensions.height !== 3000) {
      errors.push('Cover art must be exactly 3000 × 3000 pixels')
    }
  }

  if (data.validationError) {
    errors.push(data.validationError)
  }

  return errors
}

/**
 * Validate platforms step
 */
export function validatePlatforms(platforms: PlatformData[]): string[] {
  const selected = platforms.filter((p) => p.selected)
  if (selected.length === 0) {
    return ['At least one distribution platform must be selected']
  }
  return []
}

/**
 * Validate tracks step
 */
export function validateTracks(tracks: TrackData[], releaseType: ReleaseType): string[] {
  const errors: string[] = []
  const minTracks = MIN_TRACKS_BY_TYPE[releaseType]

  if (tracks.length < minTracks) {
    errors.push(`${releaseType} requires at least ${minTracks} track${minTracks > 1 ? 's' : ''}`)
  }

  const maxTracks = MAX_TRACKS_BY_TYPE[releaseType]
  if (tracks.length > maxTracks) {
    errors.push(`${releaseType} cannot exceed ${maxTracks} tracks`)
  }

  // Check for duplicate track numbers
  const trackNumbers = tracks.map((t) => t.trackNumber)
  const duplicates = trackNumbers.filter((n, i) => trackNumbers.indexOf(n) !== i)
  if (duplicates.length > 0) {
    errors.push('Duplicate track numbers found')
  }

  // Validate each track
  tracks.forEach((track, i) => {
    const trackErrors = validateTrack(track)
    if (trackErrors.length > 0) {
      errors.push(`Track ${i + 1}: ${trackErrors.join('; ')}`)
    }
  })

  return errors
}

/**
 * Full wizard validation — returns all errors grouped by step
 */
export function validateWizard(state: WizardState): Record<number, string[]> {
  return {
    1: validateReleaseInfo(state.releaseInfo),
    2: validateCoverArt(state.coverArt),
    3: validatePlatforms(state.platforms),
    4: validateTracks(state.tracks, state.releaseInfo.releaseType),
    5: [], // Validation step shows results, doesn't add new ones
    6: [], // Actions step
  }
}

/**
 * Check if a step can be navigated to (all previous steps valid)
 */
export function canNavigateToStep(state: WizardState, targetStep: number): boolean {
  for (let step = 1; step < targetStep; step++) {
    const errors = validateWizard(state)[step]
    if (errors.length > 0) return false
  }
  return true
}

/**
 * Get the first invalid step number (or null if all valid)
 */
export function getFirstInvalidStep(state: WizardState): number | null {
  for (let step = 1; step <= 5; step++) {
    const errors = validateWizard(state)[step]
    if (errors.length > 0) return step
  }
  return null
}

/**
 * Simple URL validation
 */
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch {
    return false
  }
}

/**
 * Create a new track with defaults
 */
export function createEmptyTrack(trackNumber: number): TrackData {
  return {
    key: `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    trackNumber,
    songTitle: '',
    audioFile: null,
    audioPreviewUrl: null,
    duration: null,
    language: 'en',
    explicit: false,
    instrumental: false,
    songwriters: [],
    composers: [],
    producers: [],
    validationErrors: [],
  }
}

/**
 * Re-sequence track numbers after add/remove/reorder
 */
export function resequenceTracks(tracks: TrackData[]): TrackData[] {
  return tracks.map((track, index) => ({
    ...track,
    trackNumber: index + 1,
  }))
}

/**
 * Format duration from seconds to MM:SS
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Parse MM:SS or HH:MM:SS to seconds
 */
export function parseDuration(str: string): number | null {
  const parts = str.split(':').map(Number)
  if (parts.some(Number.isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/**
 * Generate a unique key for a new track
 */
export function generateTrackKey(): string {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
