import { readStorageItem, removeStorageItem, setStorageItem } from '@/lib/browser-storage'

const STORAGE_KEY = 'spilrix_session'

export interface ArtistSession {
  id: string
  name: string
  photo_url: string | null
  display_id?: number
}

/** Pure parse — safe to call with the raw value from useBrowserStorageValue. */
export function parseSession(raw: string | null | undefined): ArtistSession | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as ArtistSession
    if (!parsed?.id || !parsed?.name) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(session: ArtistSession): void {
  setStorageItem('localStorage', STORAGE_KEY, JSON.stringify(session))
}

export function getSession(): ArtistSession | null {
  return parseSession(readStorageItem('localStorage', STORAGE_KEY))
}

export function clearSession(): void {
  removeStorageItem('localStorage', STORAGE_KEY)
}

export { STORAGE_KEY as SESSION_STORAGE_KEY }
