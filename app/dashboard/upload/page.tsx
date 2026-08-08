'use client'

import { UploadWizard } from '@/components/dashboard/upload-wizard'
import { useArtistSession } from '@/components/dashboard/SessionProvider'
import { UploadAccessLocked } from '@/components/dashboard/UploadAccessCard'

export default function UploadPage() {
  const { uploadAccess } = useArtistSession()
  if (!uploadAccess?.active) return <UploadAccessLocked />
  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <header className="mb-8">
        <p className="inline-block -rotate-2 bg-cobalt px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white">
          New submission
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase text-ink">Upload a release</h1>
        <p className="mt-2 text-sm font-medium text-ink-soft">
          Complete the 6-step wizard to distribute your music worldwide.
        </p>
      </header>

      <UploadWizard
        mode="create"
        onSuccess={() => window.location.href = '/dashboard/status'}
      />
    </div>
  )
}
