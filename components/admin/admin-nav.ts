import {
  BarChart3,
  Disc3,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AdminTab =
  | 'overview'
  | 'artists'
  | 'releases'
  | 'tickets'
  | 'logs'
  | 'settings'

export interface AdminTabConfig {
  id: AdminTab
  label: string
  icon: LucideIcon
  /** Which count key drives the sidebar badge for this tab. */
  countKey?: 'pendingReleases' | 'openTickets' | 'totalArtists' | 'totalReleases'
}

/**
 * The single source of truth for the admin navigation. Drives both the desktop
 * sidebar and the mobile drawer, so the two can never drift out of sync.
 */
export const ADMIN_TABS: AdminTabConfig[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'artists', label: 'Artists', icon: Users, countKey: 'totalArtists' },
  { id: 'releases', label: 'Releases', icon: Disc3, countKey: 'pendingReleases' },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy, countKey: 'openTickets' },
  { id: 'logs', label: 'Activity', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

/** Counters surfaced as badges on the sidebar nav items. */
export interface AdminCounts {
  totalArtists?: number
  totalReleases?: number
  pendingReleases?: number
  openTickets?: number
}
