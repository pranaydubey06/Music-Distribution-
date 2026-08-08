'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { isAuthRecoveryUrl } from '@/lib/auth-redirect'

/**
 * Root gateway: logged-in (verified) users go to the dashboard,
 * everyone else goes to the login page.
 *
 * Exception: password-reset email links. When the Supabase email template
 * (or a misconfigured redirect URL) lands the recovery link here instead of
 * /reset-password, the URL carries recovery params (?code=… or
 * #access_token=…&type=recovery). Those must reach /reset-password with the
 * params intact — and BEFORE the Supabase client is created, because client
 * creation consumes the code from the URL (detectSessionInUrl), logs the
 * user in, and they'd end up on the dashboard instead of the reset form.
 */
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthRecoveryUrl()) {
      // Full page navigation (not router.replace) so /reset-password loads
      // fresh and its Supabase client exchanges the code there.
      window.location.replace(
        `/reset-password${window.location.search}${window.location.hash}`
      )
      return
    }

    getSupabaseBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        if (data.session?.user?.email_confirmed_at) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      })
      .catch(() => router.replace('/login'))
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-canary">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-ink">
        Loading…
      </p>
    </main>
  )
}
