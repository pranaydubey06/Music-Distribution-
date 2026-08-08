import type { ReactNode } from 'react'
import Logo from '@/components/Logo'

/** Shared shell for all auth pages — the canary halftone gateway look. */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canary px-6 py-16">
      <div aria-hidden className="halftone-field absolute inset-0 opacity-[0.12]" />

      <div className="animate-fade-up relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
        </div>

        <div className="rounded-2xl border-[3px] border-ink bg-white p-8 shadow-[8px_8px_0_0_var(--color-ink)] md:p-10">
          <h1 className="font-display text-2xl uppercase text-ink">{title}</h1>
          <p className="mt-2 text-sm font-medium text-ink-soft">{subtitle}</p>
          {children}
        </div>

        <p className="mt-6 text-center font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-ink">
          Spilrix Distribution — independent release management
        </p>
      </div>
    </main>
  )
}
