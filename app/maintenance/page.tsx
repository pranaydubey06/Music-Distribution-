'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'

export default function MaintenancePage() {
  const router = useRouter()

  // The proxy/middleware only guards '/' and '/dashboard/*', not '/maintenance'
  // itself — so once an artist lands here, nothing re-checks the setting. Poll
  // /api/settings and bounce back to the site the moment maintenance is off, so
  // a refresh (or just waiting) actually clears the page.
  useEffect(() => {
    let active = true

    async function check() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (!res.ok) return
        const settings = await res.json()
        if (active && !settings.maintenance_mode) {
          router.replace('/')
        }
      } catch {
        // Can't reach settings — stay on the maintenance page.
      }
    }

    check()
    const interval = setInterval(check, 10000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-canary px-6">
      <div className="animate-fade-up w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-8 rounded-2xl border-[3px] border-ink bg-white p-8 shadow-[8px_8px_0_0_var(--color-ink)]">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-ink-faint">
            Down for maintenance
          </p>
          <h1 className="mt-3 font-display text-2xl uppercase text-ink">
            Be right back
          </h1>
          <p className="mt-3 text-sm font-medium text-ink-soft">
            Spilrix Distribution is currently undergoing maintenance. We&apos;ll be
            back up shortly — check back in a few minutes.
          </p>
        </div>
        <p className="mt-6 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
          Spilrix Distribution
        </p>
      </div>
    </main>
  )
}
