'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

function getInitialEmail(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('email')
  if (fromQuery) return fromQuery
  return null
}

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(() => getInitialEmail())
  const [isSending, setIsSending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // No query param (e.g. bookmarked) — try the current auth user.
    if (!email) {
      getSupabaseBrowserClient()
        .auth.getSession()
        .then(({ data }) => {
          if (data.session?.user?.email) setEmail(data.session.user.email)
        })
    }
  }, [email])

  async function handleResend() {
    if (!email) return
    setIsSending(true)
    setError(null)
    setNotice(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/login?verified=1` },
      })
      if (resendError) throw new Error(resendError.message)
      setNotice('Verification email sent again — check your inbox (and spam).')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend. Try again.')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AuthCard
      title="Check your email"
      subtitle="One last step before your dashboard opens up."
    >
      <div className="mt-8 flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-lg border-[2.5px] border-ink bg-paper p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-cobalt" />
          <p className="text-sm font-medium text-ink-soft">
            We sent a verification link to{' '}
            {email ? <span className="font-bold text-ink">{email}</span> : 'your email'}.
            Click it to activate your account, then log in.
          </p>
        </div>

        {notice ? (
          <p className="rounded-lg border-[2.5px] border-ink bg-lime px-4 py-3 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
            {notice}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-center text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          isLoading={isSending}
          disabled={isSending || !email}
          onClick={handleResend}
          className="w-full"
        >
          Resend verification email
        </Button>

        <p className="text-center text-sm font-medium text-ink-soft">
          Already verified?{' '}
          <Link
            href="/login"
            className="font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
