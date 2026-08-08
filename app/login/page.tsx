'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getSupabaseBrowserClient, setAuthPersistence } from '@/lib/supabase/client'
import { isAuthRecoveryUrl } from '@/lib/auth-redirect'

function getInitialNotice(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  if (params.get('verified') === '1') return 'Email verified! Log in to enter your dashboard.'
  if (params.get('reset') === '1') return 'Password updated. Log in with your new password.'
  return null
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice] = useState<string | null>(() => getInitialNotice())

  useEffect(() => {
    // A password-reset email link that landed here by mistake (default
    // Supabase template + Site URL fallback) must go to /reset-password
    // BEFORE the Supabase client touches the code in the URL.
    if (isAuthRecoveryUrl()) {
      window.location.replace(
        `/reset-password${window.location.search}${window.location.hash}`
      )
      return
    }

    // Already logged in (and verified)? Straight to the dashboard.
    const supabase = getSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email_confirmed_at) {
        router.replace('/dashboard')
      }
    })
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Must be set BEFORE signing in so the session lands in the right storage.
      setAuthPersistence(rememberMe)

      const supabase = getSupabaseBrowserClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        if (signInError.message.toLowerCase().includes('email not confirmed')) {
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`)
          return
        }
        throw new Error(
          signInError.message.toLowerCase().includes('invalid login credentials')
            ? 'Wrong email or password.'
            : signInError.message
        )
      }

      if (!data.user?.email_confirmed_at) {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`)
        return
      }

      router.replace('/dashboard')
    } catch (err) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : 'Could not log in. Try again.')
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to manage your releases.">
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        {notice ? (
          <p className="rounded-lg border-[2.5px] border-ink bg-lime px-4 py-3 text-sm font-bold text-ink shadow-[3px_3px_0_0_var(--color-ink)]">
            {notice}
          </p>
        ) : null}

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

        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 border-2 border-ink accent-cobalt"
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
          >
            Forgot password?
          </Link>
        </div>

        {error ? (
          <p className="rounded-lg border-[2.5px] border-ink bg-punch px-4 py-3 text-center text-sm font-bold text-white shadow-[3px_3px_0_0_var(--color-ink)]">
            {error}
          </p>
        ) : null}

        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting} className="w-full">
          <LogIn className="h-4 w-4" />
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>

        <p className="text-center text-sm font-medium text-ink-soft">
          New to Spilrix?{' '}
          <Link
            href="/register"
            className="font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
          >
            Create an account
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
