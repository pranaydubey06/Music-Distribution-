import ComingSoon from '@/components/dashboard/ComingSoon'
import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <ComingSoon
      icon={Bell}
      title="Notifications"
      description="Release and ticket alerts are on the roadmap — not available yet."
    />
  )
}
