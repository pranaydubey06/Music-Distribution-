'use client'

import { Check, Music2 } from 'lucide-react'
import { FaAmazon } from 'react-icons/fa'
import {
  SiApplemusic,
  SiFacebook,
  SiInstagram,
  SiSpotify,
  SiYoutubemusic,
} from 'react-icons/si'
import type { IconType } from 'react-icons'
import { cn } from '@/lib/utils'
import type { PlatformData } from '../types'
import { DEFAULT_PLATFORMS, OPTIONAL_PLATFORMS } from '../types'

interface Step3PlatformsProps {
  platforms: PlatformData[]
  onPlatformsChange: (platforms: PlatformData[]) => void
}

const PLATFORM_ICONS: Record<string, IconType | IconType[]> = {
  spotify: SiSpotify,
  apple_music: SiApplemusic,
  youtube_music: SiYoutubemusic,
  amazon_music: FaAmazon,
  instagram_facebook: [SiInstagram, SiFacebook],
}

function PlatformIcon({ platformId }: { platformId: string }) {
  const icon = PLATFORM_ICONS[platformId]
  const icons = Array.isArray(icon) ? icon : [icon ?? Music2]

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center gap-0.5 rounded-md border-2 border-ink bg-paper" aria-hidden="true">
      {icons.map((Icon, index) => <Icon key={index} className={cn('text-ink', icons.length > 1 ? 'h-3.5 w-3.5' : 'h-4 w-4')} />)}
    </span>
  )
}

export default function Step3Platforms({ platforms, onPlatformsChange }: Step3PlatformsProps) {
  const indiaPlatforms = [...DEFAULT_PLATFORMS, ...OPTIONAL_PLATFORMS].map((availablePlatform) => {
    const savedPlatform = platforms.find((platform) => platform.id === availablePlatform.id)
    return savedPlatform ?? { ...availablePlatform, selected: availablePlatform.isDefault }
  })

  const handleToggle = (id: string) => {
    onPlatformsChange(
      indiaPlatforms.map((platform) => platform.id === id ? { ...platform, selected: !platform.selected } : platform)
    )
  }

  const selectedCount = indiaPlatforms.filter((platform) => platform.selected).length

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="font-display text-xl uppercase text-ink">Distribution Platforms</p>
        <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft">
          Choose the India-available platforms where your release should be delivered.
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft">
          Available in India
        </h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indiaPlatforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              onClick={() => handleToggle(platform.id)}
              aria-pressed={platform.selected}
              className={cn(
                'brutal-press group flex min-h-20 items-center gap-3 rounded-lg border-[2.5px] p-3 text-left transition-all',
                platform.selected
                  ? 'border-ink bg-canary shadow-[3px_3px_0_0_var(--color-ink)]'
                  : 'border-ink bg-white hover:-translate-y-0.5 hover:border-cobalt hover:shadow-[3px_3px_0_0_var(--color-ink)]'
              )}
            >
              <span className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
                platform.selected ? 'border-ink bg-ink text-canary' : 'border-ink/40 bg-paper text-transparent'
              )}>
                <Check className="h-3.5 w-3.5" />
              </span>
              <PlatformIcon platformId={platform.id} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-body font-medium text-ink">{platform.name}</span>
                <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                  {platform.selected ? 'Selected' : 'Click to add'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={cn(
        'rounded-lg border-[2.5px] p-3',
        selectedCount > 0 ? 'border-canary bg-canary/10' : 'border-punch bg-punch/10'
      )}>
        <p className={cn(
          'flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em]',
          selectedCount > 0 ? 'text-ink' : 'text-punch'
        )}>
          <Check className={cn('h-3.5 w-3.5', selectedCount > 0 ? 'text-lime-deep' : 'text-punch')} />
          {selectedCount > 0
            ? `${selectedCount} platform${selectedCount !== 1 ? 's' : ''} selected for distribution`
            : 'Select at least one platform'}
        </p>
      </div>
    </div>
  )
}
