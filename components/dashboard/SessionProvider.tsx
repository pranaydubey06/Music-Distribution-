'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { clearSession, type ArtistSession } from '@/lib/session'
import type { UploadAccessState } from '@/lib/types'

interface SessionContextValue {
  artist: ArtistSession
  signOut: () => void
  /** Lets the profile panel push name/photo edits into the live session. */
  updateArtist: (patch: Partial<ArtistSession>) => void
  uploadAccess: UploadAccessState | null
  refreshUploadAccess: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * Guards every /dashboard route behind Supabase Auth:
 *   no session          → /login
 *   unverified email    → /verify-email
 *   verified            → load (or self-heal) the artist profile row
 */
export function DashboardSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  // undefined = still resolving · null = redirecting away · object = ready
  const [artist, setArtist] = useState<ArtistSession | null | undefined>(undefined)
  const [uploadAccess, setUploadAccess] = useState<UploadAccessState | null>(null)

  const artistId = artist?.id

  const refreshUploadAccess = useCallback(async () => {
    if (!artistId) return
    const response = await fetch(`/api/artist-access?artist_id=${artistId}`)
    if (response.ok) setUploadAccess(await response.json())
  }, [artistId])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let active = true

    async function resolve() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      if (!session?.user) {
        setArtist(null)
        router.replace('/login')
        return
      }

      const user = session.user

      if (!user.email_confirmed_at) {
        setArtist(null)
        router.replace(`/verify-email?email=${encodeURIComponent(user.email ?? '')}`)
        return
      }

      // All artist API calls carry the signed-in user's access token. The
      // server independently resolves it to an artist profile, so IDs in
      // URLs or request bodies can no longer be used to access another user.
      const originalFetch = window.fetch.bind(window)
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
        if (!url.startsWith('/api/')) return originalFetch(input, init)

        const headers = new Headers(init?.headers)
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${session.access_token}`)
        return originalFetch(input, { ...init, headers })
      }

      // Load the artist profile for this auth user.
      let profile: ArtistSession | null = null
      const res = await fetch(`/api/artists?user_id=${user.id}`)

      if (res.ok) {
        const result = await res.json()
        profile = result.artist
      } else if (res.status === 404) {
        // Registration created the auth account but the profile insert
        // failed (or the tab closed early). Recreate it from the metadata
        // saved at sign-up.
        const meta = user.user_metadata as { artist_name?: string; photo_url?: string | null }
        const createRes = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: meta.artist_name || user.email?.split('@')[0] || 'Artist',
            photo_url: meta.photo_url ?? null,
            user_id: user.id,
            email: user.email ?? null,
          }),
        })
        if (createRes.ok) {
          const result = await createRes.json()
          profile = result.artist
        }
      }

      if (!active) return

      if (!profile) {
        // Could not load or create a profile — treat as signed out rather
        // than leaving the user on a broken dashboard.
        await supabase.auth.signOut()
        setArtist(null)
        router.replace('/login')
        return
      }

      setArtist({ id: profile.id, name: profile.name, photo_url: profile.photo_url, display_id: profile.display_id })
    }

    resolve()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setArtist(null)
        router.replace('/login')
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [router])

  // Access may be changed by an admin in another session. Keep the lock state
  // in sync without asking the artist to reload the dashboard.
  useEffect(() => {
    if (!artistId) return
    let active = true
    const checkAccess = async () => {
      const response = await fetch(`/api/artist-access?artist_id=${artistId}`)
      if (response.ok && active) setUploadAccess(await response.json())
    }
    void checkAccess()
    const interval = window.setInterval(() => void checkAccess(), 5000)
    const onFocus = () => void checkAccess()
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [artistId])

  const signOut = useCallback(() => {
    const supabase = getSupabaseBrowserClient()
    clearSession() // also clear any legacy pre-auth session
    supabase.auth.signOut().finally(() => router.replace('/login'))
  }, [router])

  const updateArtist = useCallback((patch: Partial<ArtistSession>) => {
    setArtist((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  if (!artist) {
    return (
      <div className="brutal-cursor flex min-h-screen items-center justify-center bg-paper">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-ink-faint">
          Loading dashboard…
        </p>
      </div>
    )
  }

  return (
    <SessionContext.Provider value={{ artist, signOut, updateArtist, uploadAccess, refreshUploadAccess }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useArtistSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useArtistSession must be used within DashboardSessionProvider')
  }
  return ctx
}
