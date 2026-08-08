import type { ReactNode } from 'react'
import { DashboardSessionProvider } from '@/components/dashboard/SessionProvider'
import TopNav from '@/components/dashboard/TopNav'
import Sidebar from '@/components/dashboard/Sidebar'
import MobileTabs from '@/components/dashboard/MobileTabs'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardSessionProvider>
      <div className="brutal-cursor min-h-screen bg-paper">
        <TopNav />
        <MobileTabs />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 px-6 py-8 md:px-10 md:py-10">{children}</main>
        </div>
      </div>
    </DashboardSessionProvider>
  )
}
