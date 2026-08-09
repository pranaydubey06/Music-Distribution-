'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, User as UserIcon, UserPlus } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { getSupabaseBrowserClient, setAuthPersistence } from '@/lib/supabase/client'
import { getFileExtension, slugify } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoChange(file: File | null) {
    setPhotoFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError('Enter your artist name.')
      return
    }
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

      // New accounts default to "remember me" until they log in and choose.
      setAuthPersistence(true)

      // 1. Optional profile photo → storage first, so we have the URL ready.
      let photoUrl: string | null = null
      if (photoFile) {
        const extension = getFileExtension(photoFile.name) || 'jpg'
        const path = `${slugify(trimmedName)}-${Date.now()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(path, photoFile, { cacheControl: '3600', upsert: false })
        if (uploadError) throw new Error(uploadError.message)
        photoUrl = supabase.storage.from('profiles').getPublicUrl(path).data.publicUrl
      }

      // 2. Create the auth account. The verification email links back to
      //    /login with a success banner.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=1`,
          // Kept in auth metadata so the profile can be self-healed later
          // if the profile-creation call below ever fails.
          data: { artist_name: trimmedName, photo_url: photoUrl },
        },
      })

      if (signUpError) {
        throw new Error(
          signUpError.message.toLowerCase().includes('already registered')
            ? 'This email already has an account. Try logging in instead.'
            : signUpError.message
        )
      }

      if (!data.user) {
        throw new Error('Could not create your account. Try again.')
      }

      // Supabase returns a user with an empty identities array when the
      // email is already registered (it hides this by default for privacy).
      if (data.user.identities && data.user.identities.length === 0) {
        throw new Error('This email already has an account. Try logging in instead.')
      }

      // 3. A verified session is required before the API may create a
      // profile. When confirmation is enabled, SessionProvider self-heals it
      // securely on the user's first login.
      if (data.session) {
        const response = await fetch('/api/artists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ name: trimmedName, photo_url: photoUrl, user_id: data.user.id, email: trimmedEmail }),
        })

        if (!response.ok) {
        // Not fatal — SessionProvider self-heals a missing profile on first
        // dashboard load using the auth metadata saved above.
          console.error('Artist profile creation failed; will retry on first login.')
        }
      }

      // 4. Email confirmation ON (normal case) → no session yet → verify page.
      //    Confirmation OFF → session exists → straight to the dashboard.
      if (data.session) {
        router.replace('/dashboard')
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(trimmedEmail)}`)
      }
    } catch (err) {
      setIsSubmitting(false)
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Join Spilrix and start distributing your music.">
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3">
          <label
            htmlFor="profile-photo"
            className="group relative flex h-24 w-24 cursor-pointer items-center justify-center rounded-full border-[3px] border-ink bg-paper shadow-[4px_4px_0_0_var(--color-ink)] transition-transform hover:-translate-y-0.5"
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Profile preview"
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-8 w-8 text-ink-faint" />
            )}
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-[2.5px] border-ink bg-cobalt text-white">
              <Camera className="h-3.5 w-3.5" />
            </span>
          </label>
          <input
            id="profile-photo"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            Profile photo (optional)
          </p>
        </div>

        <Input
          label="Artist name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Naomi Reyes"
        />

        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type="password"
          required
          hint="min. 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
        />

        <Input
          label="Confirm password"
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
          <UserPlus className="h-4 w-4" />
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm font-medium text-ink-soft">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-cobalt underline underline-offset-2 hover:text-cobalt-deep"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
