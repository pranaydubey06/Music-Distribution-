'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { readStorageItem, subscribeToStorageChanges } from '@/lib/browser-storage'

type StorageArea = 'localStorage' | 'sessionStorage'

/**
 * Reads a raw string from localStorage/sessionStorage, kept in sync via
 * useSyncExternalStore.
 *
 * Returns `undefined` only for the brief server/pre-hydration snapshot.
 * After mount it always reflects the real, current value — `null` if the
 * key is absent. This is the React-recommended way to read external mutable
 * state (browser storage, in this case) without an effect + setState pair.
 */
export function useBrowserStorageValue(
  area: StorageArea,
  key: string
): string | null | undefined {
  const getSnapshot = useCallback(() => readStorageItem(area, key), [area, key])

  return useSyncExternalStore(subscribeToStorageChanges, getSnapshot, () => undefined)
}
