import { removeStorageItem } from '@/lib/browser-storage'

const STORAGE_KEY = 'spilrix_session'

export interface ArtistSession {
  id: string
  name: string
  photo_url: string | null
  display_id?: number
}

/** Clears any legacy pre-Supabase-Auth session data left in localStorage. */
export function clearSession(): void {
  removeStorageItem('localStorage', STORAGE_KEY)
}
