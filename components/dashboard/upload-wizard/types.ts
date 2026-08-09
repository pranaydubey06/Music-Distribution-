import type { ReleaseType, ReleaseStatus, AppSettings, ReleaseWithTracks, Track } from '@/lib/types'

// Re-export base types from lib/types
export type { ReleaseType, ReleaseStatus, AppSettings, ReleaseWithTracks, Track }

export interface ReleaseInfoData {
  releaseType: ReleaseType
  title: string
  version?: string
  primaryArtist: string
  primaryArtistSpotifyUrl?: string
  featuringArtists?: string
  featuringArtistSpotifyUrls?: string
  releaseDate: string // YYYY-MM-DD
  originalReleaseDate?: string
  primaryGenre: string
  secondaryGenre?: string
  language: string
  recordLabel?: string
}

export interface CoverArtData {
  file: File | null
  previewUrl: string | null
  dimensions: { width: number; height: number } | null
  validationError: string | null
  existingUrl?: string | null
}

export interface PlatformData {
  id: string
  name: string
  isDefault: boolean
  selected: boolean
}

export interface TrackData {
  key: string
  trackNumber: number
  songTitle: string
  version?: string
  audioFile: File | null
  audioPreviewUrl: string | null
  duration: number | null // seconds
  isrc?: string
  language: string
  explicit: boolean
  instrumental: boolean
  featuringArtists?: string
  songwriters: string[]
  composers: string[]
  producers: string[]
  lyrics?: string
  validationErrors: string[]
}

export interface WizardState {
  currentStep: number // 1-6
  completedSteps: number[] // Steps user has visited/validated
  releaseInfo: ReleaseInfoData
  coverArt: CoverArtData
  platforms: PlatformData[]
  tracks: TrackData[]
  isSubmitting: boolean
  uploadProgress: { step: string; loaded: number; total: number } | null
  /** Live value from Admin Settings; defaults to 50 until settings load. */
  audioMaxUploadMb: number
  validationErrors: Record<number, string[]>
  draftId: string | null
  lastSaved: number | null
  mode?: 'create' | 'edit'
  existingRelease?: { id?: string }
}

export interface DraftData {
  wizardState: WizardState
  version: 1
  updatedAt: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface StepValidation {
  step: number
  isValid: boolean
  errors: string[]
}

// The core services are preselected for convenience, but every platform can
// be turned on or off by the artist.
export const DEFAULT_PLATFORMS: PlatformData[] = [
  { id: 'spotify', name: 'Spotify', isDefault: true, selected: true },
  { id: 'apple_music', name: 'Apple Music', isDefault: true, selected: true },
  { id: 'youtube_music', name: 'YouTube Music', isDefault: true, selected: true },
]

// Distribution services currently available to artists and listeners in India.
export const OPTIONAL_PLATFORMS: Omit<PlatformData, 'selected'>[] = [
  { id: 'amazon_music', name: 'Amazon Music', isDefault: false },
  { id: 'instagram_facebook', name: 'Instagram / Facebook', isDefault: false },
  { id: 'jiosaavn', name: 'JioSaavn', isDefault: false },
  { id: 'gaana', name: 'Gaana', isDefault: false },
  { id: 'hungama', name: 'Hungama Music', isDefault: false },
]

export const ADDITIONAL_PLATFORMS = OPTIONAL_PLATFORMS
export const RELEASE_TYPES: ReleaseType[] = ['Single', 'EP', 'Album']

// Genres - matching common music distribution lists
export const GENRES = [
  'Pop', 'Rock', 'Hip-Hop/Rap', 'Electronic', 'R&B/Soul', 'Country',
  'Jazz', 'Classical', 'Reggae', 'Blues', 'Folk', 'Metal', 'Punk',
  'Indie', 'Alternative', 'Funk', 'Disco', 'House', 'Techno', 'Trance',
  'Dubstep', 'Drum & Bass', 'Ambient', 'Soundtrack', 'World', 'Latin',
  'K-Pop', 'Afrobeats', 'Gospel', 'Christian', 'Comedy', 'Spoken Word',
  "Children's", 'Fitness & Workout', 'Holiday', 'Instrumental',
] as const

// Languages
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'he', name: 'Hebrew' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ms', name: 'Malay' },
  { code: 'tl', name: 'Filipino' },
  { code: 'other', name: 'Other' },
] as const

// Minimum tracks per release type
export const MIN_TRACKS_BY_TYPE: Record<ReleaseType, number> = {
  Single: 1,
  EP: 2,
  Album: 5,
}

// Maximum tracks per release type (soft limits)
export const MAX_TRACKS_BY_TYPE: Record<ReleaseType, number> = {
  Single: 1,
  EP: 6,
  Album: 30,
}

// Validation constants
export const COVER_ART_REQUIRED_DIMENSIONS = { width: 3000, height: 3000 } as const
export const COVER_ART_MAX_SIZE_MB = 10
export const COVER_ART_ALLOWED_TYPES = ['image/jpeg', 'image/png'] as const
export const COVER_ART_REQUIREMENTS = {
  width: COVER_ART_REQUIRED_DIMENSIONS.width,
  height: COVER_ART_REQUIRED_DIMENSIONS.height,
  maxSizeMB: COVER_ART_MAX_SIZE_MB,
  allowedTypes: COVER_ART_ALLOWED_TYPES,
} as const

export const DRAFT_STORAGE_PREFIX = 'spilrix-upload-draft:'
export const DRAFT_VERSION = 1 as const

export const AUDIO_ALLOWED_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave'] as const

export const ISRC_REGEX = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/
