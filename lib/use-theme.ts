'use client'

import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'spilrix_theme'

function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Storage unavailable (private mode) — theme still applies for this page.
  }
}

/**
 * Theme state hook. The <html> class is set before paint by the inline
 * script in app/layout.tsx; this hook just reads/writes the same key so
 * toggles are instant and persist across visits.
 */
export function useTheme() {
  // Start as 'light' on the server; sync to the real value after mount.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light'
    return readStoredTheme()
  })

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, setTheme, toggleTheme }
}

export { THEME_KEY }
