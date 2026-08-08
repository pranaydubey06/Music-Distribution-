'use client'

type StorageArea = 'localStorage' | 'sessionStorage'

const listeners = new Set<() => void>()

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function notify(): void {
  listeners.forEach((listener) => listener())
}

export function readStorageItem(area: StorageArea, key: string): string | null {
  if (!isBrowser()) return null
  return window[area].getItem(key)
}

export function setStorageItem(area: StorageArea, key: string, value: string): void {
  if (!isBrowser()) return
  window[area].setItem(key, value)
  notify()
}

export function removeStorageItem(area: StorageArea, key: string): void {
  if (!isBrowser()) return
  window[area].removeItem(key)
  notify()
}

/** Subscribes to both same-tab writes (via the helpers above) and cross-tab writes (native 'storage' event). */
export function subscribeToStorageChanges(callback: () => void): () => void {
  listeners.add(callback)
  window.addEventListener('storage', callback)

  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}
