import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Spilrix Admin',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="brutal-cursor">{children}</div>
}
