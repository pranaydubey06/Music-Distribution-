'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  LifeBuoy,
  Lock,
  Settings,
  TrendingUp,
  UploadCloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useArtistSession } from '@/components/dashboard/SessionProvider'

const NAV_TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/upload', label: 'Upload', icon: UploadCloud },
  { href: '/pricing', label: 'Pricing', icon: CreditCard },
  { href: '/dashboard/status', label: 'Status', icon: BarChart3 },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  { href: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const COMING_SOON_TABS = [
  { href: '/dashboard/royalties', label: 'Royalties', icon: TrendingUp },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { uploadAccess } = useArtistSession()

  return (
    <aside className="hidden w-60 flex-col gap-3 border-r-[3px] border-ink px-4 py-8 md:flex">
      {NAV_TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href
        const locked = label === 'Upload' && !uploadAccess?.active

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg border-[3px] px-3.5 py-3 text-sm font-bold uppercase tracking-wide transition-all duration-150',
              isActive
                ? 'border-ink bg-canary text-ink shadow-[3px_3px_0_0_var(--color-ink)]'
                : 'border-transparent text-ink-soft hover:border-ink hover:bg-white hover:shadow-[3px_3px_0_0_var(--color-ink)]'
            )}
          >
            {locked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            {label}
          </Link>
        )
      })}

      <div className="mt-2 border-t-2 border-dashed border-ink/30 pt-3">
        {COMING_SOON_TABS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-[3px] px-3.5 py-3 text-sm font-bold uppercase tracking-wide transition-colors',
                isActive
                  ? 'border-ink bg-canary text-ink shadow-[3px_3px_0_0_var(--color-ink)]'
                  : 'border-transparent text-ink-faint hover:bg-paper'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              <Lock className="ml-auto h-3.5 w-3.5" />
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
