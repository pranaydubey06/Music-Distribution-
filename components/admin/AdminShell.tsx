'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'
import {
  ADMIN_TABS,
  type AdminCounts,
  type AdminTab,
} from '@/components/admin/admin-nav'

interface AdminShellProps {
  activeTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  onSignOut: () => void
  counts?: AdminCounts
  children: ReactNode
}

/**
 * The persistent admin chrome: a sticky left sidebar on desktop, a top bar +
 * slide-in drawer on mobile. Keeps every workspace one click away without
 * consuming vertical space the way the old top command bar did.
 */
export default function AdminShell({
  activeTab,
  onTabChange,
  onSignOut,
  counts,
  children,
}: AdminShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Close the mobile drawer whenever the tab changes.
  function handleTabChange(tab: AdminTab) {
    setMobileNavOpen(false)
    onTabChange(tab)
  }

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [mobileNavOpen])

  const activeConfig = ADMIN_TABS.find((t) => t.id === activeTab)

  return (
    <div className="min-h-screen bg-paper">
      {/* ===== Desktop sidebar ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r-[3px] border-ink bg-white lg:flex">
        <div className="flex items-center gap-3 border-b-[3px] border-ink px-5 py-4">
          <Logo />
        </div>

        <div className="px-4 pt-5 pb-2">
          <span className="-rotate-2 inline-block bg-canary px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink">
            Control room
          </span>
        </div>

        <nav
          aria-label="Admin navigation"
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 scrollbar-thin"
        >
          {ADMIN_TABS.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            const countValue = tab.countKey ? counts?.[tab.countKey] : undefined
            const showBadge =
              typeof countValue === 'number' &&
              countValue > 0 &&
              (tab.countKey === 'pendingReleases' ||
                tab.countKey === 'openTickets')

            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'brutal-press group flex items-center gap-3 rounded-lg border-[2.5px] px-3 py-2.5 text-left font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors',
                  isActive
                    ? 'border-ink bg-canary text-ink shadow-[3px_3px_0_0_var(--color-ink)]'
                    : 'border-transparent bg-transparent text-ink-soft hover:border-ink hover:bg-paper hover:text-ink'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-200',
                    isActive ? 'scale-110' : 'group-hover:scale-105'
                  )}
                  aria-hidden="true"
                />
                <span className="flex-1">{tab.label}</span>
                {showBadge ? (
                  <span
                    className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-md border-2 border-ink px-1 font-mono text-[9px] font-bold',
                      tab.countKey === 'openTickets'
                        ? 'bg-cobalt text-white'
                        : 'bg-punch text-white'
                    )}
                  >
                    {countValue}
                  </span>
                ) : null}
              </button>
            )
          })}
        </nav>

        <div className="border-t-[3px] border-ink p-3">
          <button
            type="button"
            onClick={onSignOut}
            className="brutal-press flex w-full items-center gap-2 rounded-lg border-[2.5px] border-ink bg-white px-3 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink shadow-[3px_3px_0_0_var(--color-ink)] transition-colors hover:bg-punch hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Lock panel
          </button>
        </div>
      </aside>

      {/* ===== Mobile top bar ===== */}
      <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-paper/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="-rotate-2 hidden bg-canary px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink sm:inline-block">
              {activeConfig?.label}
            </span>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              className="brutal-press flex h-10 w-10 items-center justify-center rounded-md border-[2.5px] border-ink bg-white text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ===== Mobile drawer ===== */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <div
            className="absolute inset-0 bg-ink/50 animate-fade-in"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r-[3px] border-ink bg-white animate-fade-up">
            <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink px-4 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation"
                className="brutal-press flex h-10 w-10 items-center justify-center rounded-md border-[2.5px] border-ink bg-white text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav
              aria-label="Admin navigation"
              className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 scrollbar-thin"
            >
              {ADMIN_TABS.map((tab) => {
                const isActive = activeTab === tab.id
                const Icon = tab.icon
                const countValue = tab.countKey ? counts?.[tab.countKey] : undefined
                const showBadge =
                  typeof countValue === 'number' &&
                  countValue > 0 &&
                  (tab.countKey === 'pendingReleases' ||
                    tab.countKey === 'openTickets')

                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'brutal-press flex items-center gap-3 rounded-lg border-[2.5px] px-3 py-3 text-left font-mono text-xs font-bold uppercase tracking-[0.1em] transition-colors',
                      isActive
                        ? 'border-ink bg-canary text-ink shadow-[3px_3px_0_0_var(--color-ink)]'
                        : 'border-transparent bg-transparent text-ink-soft hover:border-ink hover:bg-paper hover:text-ink'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{tab.label}</span>
                    {showBadge ? (
                      <span
                        className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-md border-2 border-ink px-1 font-mono text-[9px] font-bold',
                          tab.countKey === 'openTickets'
                            ? 'bg-cobalt text-white'
                            : 'bg-punch text-white'
                        )}
                      >
                        {countValue}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </nav>

            <div className="border-t-[3px] border-ink p-3">
              <button
                type="button"
                onClick={onSignOut}
                className="brutal-press flex w-full items-center gap-2 rounded-lg border-[2.5px] border-ink bg-white px-3 py-3 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink shadow-[3px_3px_0_0_var(--color-ink)] transition-colors hover:bg-punch hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Lock panel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===== Content ===== */}
      <div className="lg:pl-64">
        <div className="mx-auto max-w-[82rem] px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </div>
    </div>
  )
}
