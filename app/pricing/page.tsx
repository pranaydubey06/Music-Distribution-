'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Crown,
  ExternalLink,
  HelpCircle,
  Music,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
import Logo from '@/components/Logo'
import EqualizerAnimation from '@/components/EqualizerAnimation'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { PRICING_PLANS, type PricingPlan } from '@/lib/pricing-plans'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Artist, UploadAccessState } from '@/lib/types'

const DEFAULT_TELEGRAM_USERNAME = 'Dex_Error_404'

/** Builds the pre-filled Telegram chat link used for the "Buy Now" flow. */
function buildTelegramBuyLink(telegramUsername: string, plan: PricingPlan, artist: Artist): string {
  const uid = artist.display_id ?? artist.id
  const message = `Hi! Mujhe ${plan.name} (${plan.priceFormatted}) ka plan buy karna hai.\n\nArtist Name: ${artist.name}\nArtist UID: ${uid}`
  return `https://t.me/${telegramUsername}?text=${encodeURIComponent(message)}`
}

export default function PricingPage() {
  const router = useRouter()
  const [sessionArtist, setSessionArtist] = useState<Artist | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [accessState, setAccessState] = useState<UploadAccessState | null>(null)
  const [telegramUsername, setTelegramUsername] = useState(DEFAULT_TELEGRAM_USERNAME)

  // "Buy Now" hands off to Telegram — this just tracks which plan the
  // confirmation panel below is showing instructions for.
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)

  // Fetch public app settings (Telegram contact username) — no auth needed.
  useEffect(() => {
    let active = true
    fetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((settings) => {
        if (active && settings?.telegram_username) {
          setTelegramUsername(settings.telegram_username)
        }
      })
      .catch(() => {
        // Fall back to the default username set above.
      })
    return () => {
      active = false
    }
  }, [])

  // Fetch logged in session if any
  useEffect(() => {
    let active = true
    async function loadUserSession() {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          // The `artists` table has RLS enabled with zero policies for the
          // anon/authenticated roles — it's only readable via the service
          // role, server-side. Querying it directly from the browser client
          // here always returned null, which is why this page never
          // recognized a logged-in artist. Go through the API route instead.
          const artistRes = await fetch(`/api/artists?user_id=${session.user.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          })

          if (artistRes.ok) {
            const { artist } = await artistRes.json()

            if (artist && active) {
              setSessionArtist(artist)
              // Load access. This page lives outside DashboardSessionProvider,
              // so the Authorization header has to be attached manually.
              const res = await fetch(`/api/artist-access?artist_id=${artist.id}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
              })
              if (res.ok) {
                const acc = await res.json()
                if (active) setAccessState(acc)
              }
            }
          }
        }
      } catch (err) {
        console.error('Session error on pricing page:', err)
      } finally {
        if (active) setIsSessionLoading(false)
      }
    }
    loadUserSession()
    return () => {
      active = false
    }
  }, [])

  // Handle Plan Purchase: opens a pre-filled Telegram chat with the admin.
  // The admin completes the payment in chat, then unlocks the artist's
  // upload access from the admin panel — there is no automated checkout.
  const handlePurchase = (plan: PricingPlan) => {
    if (!sessionArtist) {
      // Sign in first so the Telegram message can include the artist's UID.
      router.push(`/login?redirect=/pricing&selectedPlan=${encodeURIComponent(plan.name)}`)
      return
    }

    setSelectedPlan(plan)
    const link = buildTelegramBuyLink(telegramUsername, plan, sessionArtist)
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-canary">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b-[3px] border-ink bg-white px-6 md:px-12">
        <div className="flex items-center gap-4">
          {isSessionLoading ? (
            <div className="h-4 w-24 animate-pulse rounded bg-ink/10" />
          ) : (
            <Link
              href={sessionArtist ? '/dashboard' : '/'}
              className="brutal-press flex items-center gap-1 text-xs font-bold uppercase text-ink-soft hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
              {sessionArtist ? 'Back to Dashboard' : 'Home'}
            </Link>
          )}
          <div className="h-5 w-[2px] bg-ink/20" />
          <Logo />
          <EqualizerAnimation className="hidden sm:flex" />
        </div>

        <div className="flex items-center gap-3">
          {isSessionLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-ink/10" />
          ) : sessionArtist ? (
            <Link href="/dashboard">
              <Button type="button" variant="secondary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button type="button" variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button type="button" variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-12 md:py-16">
        {/* Active plan banner if logged in */}
        {accessState?.active && accessState.access && (
          <div className="mb-10 animate-fade-up rounded-xl border-[3px] border-ink bg-lime p-5 shadow-[5px_5px_0_0_var(--color-ink)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-ink bg-white">
                  <CheckCircle2 className="h-6 w-6 text-ink" />
                </div>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/70">
                    Active Subscription
                  </p>
                  <p className="font-display text-xl uppercase">
                    Current Plan: {accessState.access.plan_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold uppercase bg-white border-2 border-ink px-3 py-1 rounded-md">
                  Expires: {accessState.access.expiry_date}
                </span>
                <Link href="/dashboard/upload">
                  <Button type="button" variant="primary" size="sm">
                    Go to Upload
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-canary px-4 py-1.5 font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_var(--color-ink)] mb-4">
            <Zap className="h-4 w-4 text-ink" /> Simple, Transparent Music Distribution Pricing
          </div>
          <h1 className="font-display text-4xl uppercase tracking-tight md:text-5xl lg:text-6xl">
            Distribute Your Music Worldwide
          </h1>
          <p className="mt-4 text-base font-medium text-ink-soft md:text-lg">
            Keep up to <span className="font-bold text-ink">94% of your royalties</span>. Choose the release plan that fits your career goals. Tap Buy Now to chat with us on Telegram and get unlocked.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => {
            const isPopular = plan.popular
            const isCurrent =
              accessState?.active && accessState.access?.plan_name === plan.name

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-xl border-[3px] border-ink p-6 transition-all duration-200 ${
                  isPopular
                    ? 'bg-white shadow-[8px_8px_0_0_var(--color-ink)] scale-[1.02] z-10'
                    : 'bg-white shadow-[5px_5px_0_0_var(--color-ink)] hover:shadow-[7px_7px_0_0_var(--color-ink)]'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border-2 border-ink bg-canary px-4 py-1 font-mono text-[11px] font-bold uppercase shadow-[2px_2px_0_0_var(--color-ink)] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Most Popular
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="border-b-2 border-ink/15 pb-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-2xl uppercase tracking-tight text-ink">
                        {plan.name}
                      </h3>
                      {isPopular && <Crown className="h-5 w-5 text-canary" />}
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="font-display text-4xl tracking-tight text-ink md:text-5xl">
                        {plan.priceFormatted}
                      </span>
                      <span className="font-mono text-xs font-bold uppercase text-ink-faint">
                        / {plan.durationLabel}
                      </span>
                    </div>

                    <div className="mt-2 inline-block rounded border border-ink/30 bg-paper px-2 py-0.5 font-mono text-[11px] font-bold uppercase text-ink-soft">
                      {plan.releaseLimitLabel}
                    </div>
                  </div>

                  {/* Feature List */}
                  <ul className="my-6 space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-bold text-ink">
                        <Check className="h-4 w-4 shrink-0 text-lime-dark stroke-[3]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Buy Button */}
                <div className="pt-4 border-t-2 border-ink/15">
                  {isCurrent ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full bg-lime text-ink border-2 border-ink cursor-default"
                      disabled
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant={isPopular ? 'primary' : 'secondary'}
                      className="w-full"
                      onClick={() => handlePurchase(plan)}
                    >
                      <Send className="h-4 w-4" />
                      Buy Now
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Feature Comparison Highlights */}
        <section className="mt-20 rounded-2xl border-[3px] border-ink bg-white p-8 md:p-12 shadow-[7px_7px_0_0_var(--color-ink)]">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl uppercase tracking-tight md:text-4xl">
              Why Serious Independent Artists Choose Spilrix
            </h2>
            <p className="mt-2 text-sm font-medium text-ink-soft">
              Transparent distribution, no hidden charges, and real artist profile mapping.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="p-6 border-2 border-ink bg-paper">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-ink bg-canary mb-4">
                <Music className="h-6 w-6 text-ink" />
              </div>
              <h3 className="font-display text-xl uppercase mb-2">150+ Platforms</h3>
              <p className="text-xs font-medium text-ink-soft leading-relaxed">
                Spotify, Apple Music, YouTube Music, Amazon Music, Wynk, JioSaavn, Instagram Audio, TikTok, Shazam, and more.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink bg-paper">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-ink bg-lime mb-4">
                <ShieldCheck className="h-6 w-6 text-ink" />
              </div>
              <h3 className="font-display text-xl uppercase mb-2">Human-Verified Payments</h3>
              <p className="text-xs font-medium text-ink-soft leading-relaxed">
                Buy Now opens a Telegram chat with us — pay directly, and we unlock your access from our end as soon as it&apos;s confirmed.
              </p>
            </Card>

            <Card className="p-6 border-2 border-ink bg-paper">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-ink bg-sky mb-4">
                <Crown className="h-6 w-6 text-ink" />
              </div>
              <h3 className="font-display text-xl uppercase mb-2">High Royalty Splits</h3>
              <p className="text-xs font-medium text-ink-soft leading-relaxed">
                Keep up to 94% of your total earnings without monthly surprise fees. Clear reporting in your dashboard.
              </p>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl uppercase tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            <Card className="p-5 border-2 border-ink">
              <h3 className="font-display text-lg uppercase flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-ink-soft" />
                How quickly does my Upload Access unlock after buying?
              </h3>
              <p className="mt-2 text-xs font-medium text-ink-soft leading-relaxed">
                Tapping Buy Now opens a Telegram chat with us, pre-filled with your plan and Artist UID. Send the payment there, and we&apos;ll unlock your access from the admin side — usually within a short while.
              </p>
            </Card>

            <Card className="p-5 border-2 border-ink">
              <h3 className="font-display text-lg uppercase flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-ink-soft" />
                What happens after my subscription expires?
              </h3>
              <p className="mt-2 text-xs font-medium text-ink-soft leading-relaxed">
                Your existing live music remains live on streaming services. Upload access for creating NEW releases will lock until you renew or buy another plan.
              </p>
            </Card>

            <Card className="p-5 border-2 border-ink">
              <h3 className="font-display text-lg uppercase flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-ink-soft" />
                Can I upgrade my plan later?
              </h3>
              <p className="mt-2 text-xs font-medium text-ink-soft leading-relaxed">
                Yes, you can purchase any plan at any time. New purchases immediately update your active subscription and extend your access expiry date.
              </p>
            </Card>
          </div>
        </section>
      </main>

      {/* Telegram Hand-off Panel */}
      {selectedPlan && sessionArtist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border-[3px] border-ink bg-white p-6 shadow-[8px_8px_0_0_var(--color-ink)]">
            <div className="flex items-center justify-between border-b-2 border-ink/15 pb-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-ink" />
                <h3 className="font-display text-2xl uppercase">Continue on Telegram</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="font-mono text-xs font-bold uppercase text-ink-faint hover:text-ink"
              >
                Close
              </button>
            </div>

            <div className="my-6 space-y-4">
              <div className="rounded-lg border-2 border-ink bg-canary p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/70">
                  Selected Plan
                </p>
                <p className="font-display text-2xl uppercase mt-0.5">{selectedPlan.name}</p>
                <div className="mt-2 flex items-baseline justify-between border-t border-ink/20 pt-2 font-mono text-xs font-bold">
                  <span>Total Amount:</span>
                  <span className="font-display text-xl">{selectedPlan.priceFormatted}</span>
                </div>
              </div>

              <div className="rounded-lg border-2 border-ink bg-paper p-3 text-xs font-bold">
                <p className="text-ink-faint uppercase font-mono text-[10px]">Artist Account</p>
                <p className="text-ink">{sessionArtist.name} (UID: {sessionArtist.display_id ?? sessionArtist.id})</p>
              </div>

              <p className="text-[11px] font-medium text-ink-soft">
                We opened a Telegram chat in a new tab with your plan and Artist UID
                pre-filled. Send that message, complete payment there, and we&apos;ll unlock
                your Upload Access from our side — you&apos;ll see it reflected here
                automatically once it&apos;s done.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setSelectedPlan(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                onClick={() => window.open(buildTelegramBuyLink(telegramUsername, selectedPlan, sessionArtist), '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-4 w-4" />
                Open Telegram Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
