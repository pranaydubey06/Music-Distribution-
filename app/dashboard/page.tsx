'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { UploadCloud } from 'lucide-react'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import type { ReleaseWithTracks } from '@/lib/types'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { UploadAccessSummary } from '@/components/dashboard/UploadAccessCard'

export default function HomePage() {
  const { artist } = useArtistSession()
  const [releases, setReleases] = useState<ReleaseWithTracks[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const refreshReleases = () => fetch(`/api/releases?artist_id=${artist.id}`)
      .then((res) => res.json())
      .then((result) => {
        if (isMounted) setReleases(result.releases ?? [])
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    void refreshReleases()
    const refreshInterval = window.setInterval(() => void refreshReleases(), 5000)
    const onFocus = () => void refreshReleases()
    window.addEventListener('focus', onFocus)
    return () => { isMounted = false; window.clearInterval(refreshInterval); window.removeEventListener('focus', onFocus) }
  }, [artist.id])

  const total = releases.length
  const drafts = releases.filter((r) => r.status === 'Draft').length
  const pending = releases.filter((r) => r.status === 'Pending Review').length
  const live = releases.filter((r) => r.status === 'Live').length
  const rejected = releases.filter((r) => r.status === 'Rejected').length

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <header className="mb-8">
        <p className="inline-block -rotate-2 bg-cobalt px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          Welcome back
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase text-ink">{artist.name}</h1>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          Here&apos;s where things stand with your catalog.
        </p>
      </header>

      {isLoading ? (
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-faint">
          Loading…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total releases" value={total} fill="bg-white" />
            <StatCard label="Drafts" value={drafts} fill="bg-white" />
            <StatCard label="Pending" value={pending} fill="bg-canary" />
            <StatCard label="Live" value={live} fill="bg-lime" />
            <StatCard label="Rejected" value={rejected} fill="bg-punch text-white" />
          </div>
          <UploadAccessSummary />

          {total === 0 ? (
            <Card className="mt-6 px-6 py-12 text-center">
              <p className="font-display text-lg uppercase text-ink">No releases yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-ink-soft">
                Upload your first Single, EP, or Album to start tracking it here.
              </p>
              <Link href="/dashboard/upload" className="mt-5 inline-block">
                <Button type="button">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload a release
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="mt-6">
              <Link href="/dashboard/upload">
                <Button type="button" variant="secondary">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Upload a new release
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  fill,
}: {
  label: string
  value: number
  fill: string
}) {
  return (
    <div
      className={`rounded-xl border-[3px] border-ink p-4 shadow-[4px_4px_0_0_var(--color-ink)] ${fill}`}
    >
      <p className="font-display text-3xl">{value}</p>
      <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] opacity-80">
        {label}
      </p>
    </div>
  )
}
