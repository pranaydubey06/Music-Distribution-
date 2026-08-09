export interface Artist {
  id: string
  display_id: number
  /** Supabase Auth user id. Null only for legacy pre-auth rows. */
  user_id: string | null
  email: string | null
  name: string
  photo_url: string | null
  instagram_url: string | null
  youtube_url: string | null
  spotify_url: string | null
  created_at: string
}

export type AccessPlanName = 'Single Release' | '1 Month Unlimited' | '6 Months Unlimited' | '1 Year Unlimited' | 'Custom'

/** Each admin change is a new row, so this also represents the access audit trail. */
export interface ArtistAccess {
  id: string
  artist_id: string
  upload_access: boolean
  plan_name: AccessPlanName | null
  custom_plan_name: string | null
  start_date: string | null
  expiry_date: string | null
  status: 'Locked' | 'Unlocked' | 'Expired'
  admin_notes: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface UploadAccessState {
  active: boolean
  expired: boolean
  access: ArtistAccess | null
}

export interface PaymentRecord {
  id: string
  user_id: string | null
  artist_id: string
  plan_name: AccessPlanName
  amount: number
  payment_id: string
  payment_status: string
  purchase_date: string
  start_date: string
  expiry_date: string | null
  created_at: string
}

export type ReleaseType = 'Single' | 'EP' | 'Album'

export type ReleaseStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Needs Changes'
  | 'Approved'
  | 'Sent to Platforms'
  | 'Live'
  | 'Rejected'

/** A release is the "project" — a Single, EP, or Album — made up of one or more tracks. */
export interface Release {
  id: string
  artist_id: string
  artist_name: string
  title: string
  version: string | null
  release_type: ReleaseType
  cover_art_url: string | null
  release_date: string | null
  original_release_date: string | null
  primary_genre: string | null
  secondary_genre: string | null
  language: string | null
  record_label: string | null
  primary_artist_spotify_url: string | null
  featuring_artists: string | null
  featuring_artist_spotify_urls: string | null
  distribution_platforms: string[]
  copyright: string | null
  status: ReleaseStatus
  rejection_reason: string | null
  /** Set when the admin sends the release back with "Needs Changes". */
  admin_note: string | null
  spotify_url: string | null
  apple_music_url: string | null
  youtube_url: string | null
  /** When set (and in the future), this release is scheduled for permanent deletion. */
  scheduled_deletion_at: string | null
  deletion_reason: string | null
  created_at: string
}

export interface Track {
  id: string
  release_id: string
  track_number: number
  song_title: string
  version: string | null
  genre: string | null
  audio_url: string
  duration: number | null
  explicit: boolean
  instrumental: boolean
  isrc: string | null
  language: string | null
  featuring_artists: string | null
  songwriter: string | null
  composer: string | null
  producer: string | null
  lyrics: string | null
  created_at: string
}

/** A release with its tracks attached — the shape most of the UI works with. */
export interface ReleaseWithTracks extends Release {
  tracks: Track[]
}

export type TicketStatus = 'Open' | 'Closed'

export type TicketSender = 'artist' | 'admin'

export interface TicketMessage {
  id: string
  ticket_id: string
  sender: TicketSender
  message: string
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
}

export interface Ticket {
  id: string
  artist_id: string
  artist_name: string
  subject: string
  status: TicketStatus
  created_at: string
}

export interface TicketWithMessages extends Ticket {
  messages: TicketMessage[]
}

export interface StorageUsage {
  usedBytes: number
  limitBytes: number
  fileCount: number
  byBucket: Array<{ bucketId: string; totalBytes: number; fileCount: number }>
}

export type ActivityAction =
  | 'artist_registered'
  | 'release_submitted'
  | 'release_edited'
  | 'release_duplicated'
  | 'release_deleted'
  | 'release_approved'
  | 'release_rejected'
  | 'release_needs_changes'
  | 'release_sent'
  | 'release_live'
  | 'release_deletion_scheduled'
  | 'release_deletion_cancelled'
  | 'ticket_opened'
  | 'ticket_resolved'
  | 'ticket_reopened'
  | 'profile_updated'

export interface ActivityLog {
  id: string
  artist_id: string | null
  artist_name: string | null
  action: ActivityAction
  detail: string | null
  created_at: string
}

export interface AppSettings {
  maintenance_mode: boolean
  max_upload_mb: number
  allowed_image_formats: string[]
  allowed_audio_formats: string[]
  telegram_username: string
}
