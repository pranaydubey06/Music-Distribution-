'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Home, LifeBuoy, Settings, TrendingUp, UploadCloud } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/upload', label: 'Upload', icon: UploadCloud },
  { href: '/dashboard/status', label: 'Status', icon: BarChart3 },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  { href: '/dashboard/analytics', label: 'Stats', icon: TrendingUp },
  { href: '/dashboard/settings', label: 'More', icon: Settings },
]

export default function MobileTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex border-b-[3px] border-ink md:hidden">
      {TABS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 border-r-[3px] border-ink py-3 text-[10px] font-bold uppercase last:border-r-0',
              isActive ? 'bg-canary text-ink' : 'bg-paper text-ink-soft'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
