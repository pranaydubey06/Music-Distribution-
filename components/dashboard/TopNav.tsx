'use client'

import { useState } from 'react'
import { User as UserIcon } from 'lucide-react'
import Logo from '@/components/Logo'
import EqualizerAnimation from '@/components/EqualizerAnimation'
import ProfilePanel from '@/components/dashboard/ProfilePanel'
import { useArtistSession } from '@/components/dashboard/SessionProvider'

export default function TopNav() {
  const { artist } = useArtistSession()
  const [showProfile, setShowProfile] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b-[3px] border-ink bg-paper px-6 md:px-10">
        <div className="flex items-center gap-4">
          <Logo />
          <EqualizerAnimation className="hidden sm:flex" />
        </div>

        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="brutal-press flex items-center gap-3 rounded-lg border-[3px] border-ink bg-white py-1.5 pl-1.5 pr-4 shadow-[3px_3px_0_0_var(--color-ink)] transition-shadow"
        >
          {artist.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.photo_url}
              alt={artist.name}
              className="h-9 w-9 rounded-md border-2 border-ink object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-ink bg-canary">
              <UserIcon className="h-4 w-4 text-ink" />
            </span>
          )}
          <span className="text-sm font-bold text-ink">{artist.name}</span>
        </button>
      </header>

      {showProfile ? <ProfilePanel onClose={() => setShowProfile(false)} /> : null}
    </>
  )
}
