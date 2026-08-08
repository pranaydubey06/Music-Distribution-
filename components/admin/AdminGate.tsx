'use client'

import { useState, type FormEvent } from 'react'
import { Lock } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface AdminGateProps {
  onSuccess: (passcode: string) => void
}

export default function AdminGate({ onSuccess }: AdminGateProps) {
  const [passcode, setPasscode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsVerifying(true)

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error ?? 'Incorrect passcode.')
      }

      onSuccess(passcode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect passcode.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6">
      <div aria-hidden className="halftone-field absolute inset-0 opacity-10 invert" />

      <Card className="relative z-10 w-full max-w-sm animate-fade-up p-8 shadow-[8px_8px_0_0_var(--color-canary)]">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-md border-[2.5px] border-ink bg-canary">
            <Lock className="h-5 w-5 text-ink" />
          </span>
          <h1 className="mt-4 font-display text-xl uppercase text-ink">Control room</h1>
          <p className="mt-1 text-sm font-medium text-ink-soft">Enter the admin passcode to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="password"
            required
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            aria-label="Admin passcode"
            className="w-full rounded-lg border-[3px] border-ink bg-paper px-3.5 py-3 text-center font-mono text-sm font-bold tracking-[0.3em] text-ink placeholder:font-body placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-faint focus:shadow-[3px_3px_0_0_var(--color-cobalt)] focus:outline-none"
          />

          {error ? (
            <Alert variant="error">{error}</Alert>
          ) : null}

          <Button type="submit" isLoading={isVerifying} disabled={isVerifying} className="w-full">
            Unlock
          </Button>
        </form>
      </Card>
    </main>
  )
}
