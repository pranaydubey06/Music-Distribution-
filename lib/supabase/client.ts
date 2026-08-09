import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

/**
 * "Remember me" support: Supabase always persists its session through the
 * storage adapter below. The adapter routes writes to localStorage (survives
 * browser restarts) or sessionStorage (cleared when the browser closes)
 * based on this flag, which the login page sets before signing in.
 */
const REMEMBER_KEY = 'spilrix_auth_remember'

export function setAuthPersistence(remember: boolean): void {
  try {
    window.localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0')
  } catch {
    // Storage unavailable — session will simply live in memory.
  }
}

const authStorage = {
  getItem(key: string): string | null {
    try {
      return (
        window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key)
      )
    } catch {
      return null
    }
  },
  setItem(key: string, value: string): void {
    try {
      const remember = window.localStorage.getItem(REMEMBER_KEY) !== '0'
      const target = remember ? window.localStorage : window.sessionStorage
      const other = remember ? window.sessionStorage : window.localStorage
      target.setItem(key, value)
      other.removeItem(key)
    } catch {
      // Storage unavailable — ignore.
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch {
      // Storage unavailable — ignore.
    }
  },
}

/**
 * Browser-side Supabase client, built lazily on first use.
 *
 * Uses the public anon key only, for two jobs:
 *   1. Supabase Auth (register / login / verify / reset) — sessions persist
 *      via the remember-me-aware storage adapter above.
 *   2. Direct-to-storage uploads (profile photos, covers, audio).
 *
 * All database reads and writes still go through our own API routes
 * (see /app/api/**), which use the service role key on the server — Row
 * Level Security on every table stays fully locked down.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to your environment variables.'
    )
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Handles the ?code= in email confirmation / password reset links.
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: authStorage,
    },
  })

  return browserClient
}
