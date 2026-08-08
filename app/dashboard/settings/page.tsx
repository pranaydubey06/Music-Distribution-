'use client'

import { useState } from 'react'
import { LogOut, Moon, Sun } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import { useTheme, type Theme } from '@/lib/use-theme'
import { cn } from '@/lib/utils'

const THEME_OPTIONS: { value: Theme; label: string; hint: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', hint: 'Paper & ink — the classic look', icon: Sun },
  { value: 'dark', label: 'Dark', hint: 'Charcoal — easy on the eyes', icon: Moon },
]

export default function SettingsPage() {
  const { signOut } = useArtistSession()
  const { theme, setTheme } = useTheme()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  return (
    <div className="animate-fade-up mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink-faint">
          Settings
        </p>
        <h1 className="mt-1 font-display text-2xl uppercase text-ink md:text-3xl">
          Your preferences
        </h1>
      </div>

      {/* Appearance */}
      <Card className="p-6 md:p-8">
        <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
          Appearance
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {THEME_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                'brutal-press flex flex-col items-start gap-2 rounded-lg border-[3px] p-4 text-left transition-all',
                theme === value
                  ? 'border-ink bg-canary text-ink shadow-[4px_4px_0_0_var(--color-ink)]'
                  : 'border-ink bg-white text-ink-soft hover:bg-paper'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
              <span className="text-xs font-medium">{hint}</span>
              {theme === value ? (
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em]">
                  Active
                </span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs font-medium text-ink-faint">
          Your choice is saved on this device.
        </p>
      </Card>

      {/* Sign out */}
      <Card className="p-6 md:p-8">
        <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-ink">
          Session
        </p>

        {confirmingSignOut ? (
          <div className="rounded-lg border-[2.5px] border-ink bg-paper p-4">
            <p className="font-bold text-ink">Sign out of Spilrix?</p>
            <p className="mt-1 text-sm font-medium text-ink-soft">
              You&apos;ll need your artist name to sign back in. Your releases and
              data stay safe.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="danger" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Yes, sign out
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingSignOut(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm font-medium text-ink-soft">
              End your session on this device.
            </p>
            <Button variant="ghost" onClick={() => setConfirmingSignOut(true)}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
