'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Landing page for the password-reset email link. Supabase's
 * detectSessionInUrl exchanges the ?code= in the link for a recovery
 * session automatically; once that session exists we can set the new
 * password with updateUser.
 */
export default function ResetPasswordPage() {
  const router = useRouter()

  const [ready, setReady] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    // Give detectSessionInUrl a moment to exchange the code, then check.
    let attempts = 0
    const timer = setInterval(async () => {
      attempts += 1
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        setReady(true)
        clearInterval(timer)
      } else if (attempts >= 6) {
        setReady(false)
        clearInterval(timer)
      }
    }, 500)

    return () => clearInterval(timer)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw new Error(updateError.message)

      // Fresh start with the new password.
      await supabase.auth.signOut()
      router.replace('/login?reset=1')
    } catch (err) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : 'Could not update the password.')
    }
  }

  return (
    <AuthCard title="Set a new password" subtitle="Choose something strong you'll remember.">
      {ready === null ? (
        <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
          Checking your link…
        </p>
      ) : ready === false ? (
        <div className="mt-8 flex flex-col gap-5">
          <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
            This reset link is invalid or has expired. Request a new one — and
            open it in the same browser you requested it from.
          </p>
          <p className="text-center text-sm font-medium text-ink-soft">
            <Link
              href="/forgot-password"
              className="font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
            >
              Request a new link
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Input
            label="New password"
            type="password"
            required
            autoFocus
            hint="min. 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a new password"
          />

          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Type it again"
          />

          {error ? (
            <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-center text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
            <ShieldCheck className="h-4 w-4" />
            {isSubmitting ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
