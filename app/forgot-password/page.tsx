'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/reset-password` }
      )
      if (resetError) throw new Error(resetError.message)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="We'll email you a link to set a new one."
    >
      {sent ? (
        <div className="mt-8 flex flex-col gap-5">
          <p className="rounded-lg border-[2.5px] border-ink bg-lime px-4 py-3 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
            Reset link sent to {email.trim()} — check your inbox (and spam).
            Open the link in this same browser.
          </p>
          <p className="text-center text-sm font-medium text-ink-soft">
            Remembered it?{' '}
            <Link
              href="/login"
              className="font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
            >
              Back to login
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Input
            label="Email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          {error ? (
            <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-center text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
              {error}
            </p>
          ) : null}

          <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
            <KeyRound className="h-4 w-4" />
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>

          <p className="text-center text-sm font-medium text-ink-soft">
            <Link
              href="/login"
              className="font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
            >
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}
