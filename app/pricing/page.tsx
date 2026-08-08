'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Crown,
  HelpCircle,
  Loader2,
  Music,
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

export default function PricingPage() {
  const router = useRouter()
  const [sessionArtist, setSessionArtist] = useState<Artist | null>(null)
  const [accessState, setAccessState] = useState<UploadAccessState | null>(null)

  // Payment checkout state
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<{
    planName: string
    paymentId: string
    expiryDate: string
  } | null>(null)

  // Fetch logged in session if any
  useEffect(() => {
    let active = true
    async function loadUserSession() {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) {
          const { data: artist } = await supabase
            .from('artists')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle()

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
      } catch (err) {
        console.error('Session error on pricing page:', err)
      }
    }
    loadUserSession()
    return () => {
      active = false
    }
  }, [])

  // Handle Plan Purchase
  const handlePurchase = async (plan: PricingPlan) => {
    setPaymentError(null)

    if (!sessionArtist) {
      // Prompt user to sign in or redirect
      router.push(`/login?redirect=/pricing&selectedPlan=${encodeURIComponent(plan.name)}`)
      return
    }

    setSelectedPlan(plan)
  }

  const confirmAndPay = async () => {
    if (!selectedPlan || !sessionArtist) return

    setIsProcessing(true)
    setPaymentError(null)

    try {
      // Call server-side payment verification API route. This page lives
      // outside DashboardSessionProvider, so fetch a fresh session token
      // and attach it explicitly rather than relying on the auto-auth patch.
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      const mockPaymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          artist_id: sessionArtist.id,
          plan_name: selectedPlan.name,
          payment_id: mockPaymentId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Payment verification failed.')
      }

      // Success
      setPaymentSuccess({
        planName: selectedPlan.name,
        paymentId: data.payment_id,
        expiryDate: data.access?.expiry_date ?? '',
      })

      // Update local access state
      setAccessState({
        active: true,
        expired: false,
        access: data.access,
      })
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Payment process failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-canary">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b-[3px] border-ink bg-white px-6 md:px-12">
        <div className="flex items-center gap-4">
          <Link
            href={sessionArtist ? '/dashboard' : '/'}
            className="brutal-press flex items-center gap-1 text-xs font-bold uppercase text-ink-soft hover:text-ink"
          >
            <ChevronLeft className="h-4 w-4" />
            {sessionArtist ? 'Back to Dashboard' : 'Home'}
          </Link>
          <div className="h-5 w-[2px] bg-ink/20" />
          <Logo />
          <EqualizerAnimation className="hidden sm:flex" />
        </div>

        <div className="flex items-center gap-3">
          {sessionArtist ? (
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
            Keep up to <span className="font-bold text-ink">94% of your royalties</span>. Choose the release plan that fits your career goals. Instant release unlock upon payment verification.
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
                      <CreditCard className="h-4 w-4" />
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
              <h3 className="font-display text-xl uppercase mb-2">Instant Unlock</h3>
              <p className="text-xs font-medium text-ink-soft leading-relaxed">
                Your upload access unlocks automatically in real-time as soon as server payment verification completes.
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
                Instantly! Our server-side verification activates your chosen plan immediately upon payment success. You can head straight to the Upload Wizard.
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

      {/* Payment Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-xl border-[3px] border-ink bg-white p-6 shadow-[8px_8px_0_0_var(--color-ink)]">
            {!paymentSuccess ? (
              <>
                <div className="flex items-center justify-between border-b-2 border-ink/15 pb-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-ink" />
                    <h3 className="font-display text-2xl uppercase">Complete Purchase</h3>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
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

                  {sessionArtist && (
                    <div className="rounded-lg border-2 border-ink bg-paper p-3 text-xs font-bold">
                      <p className="text-ink-faint uppercase font-mono text-[10px]">Artist Account</p>
                      <p className="text-ink">{sessionArtist.name} (UID: {sessionArtist.display_id ?? sessionArtist.id})</p>
                    </div>
                  )}

                  {paymentError && (
                    <div className="rounded-lg border-2 border-punch bg-punch/10 p-3 text-xs font-bold text-punch">
                      {paymentError}
                    </div>
                  )}

                  <p className="text-[11px] font-medium text-ink-soft">
                    By clicking Pay & Unlock, your payment will be verified securely server-side and your Spilrix Upload Access will activate immediately.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    disabled={isProcessing}
                    onClick={() => setSelectedPlan(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="flex-1"
                    disabled={isProcessing}
                    onClick={confirmAndPay}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        Pay {selectedPlan.priceFormatted} Now
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              /* Success view */
              <div className="text-center py-2 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-ink bg-lime">
                  <CheckCircle2 className="h-10 w-10 text-ink" />
                </div>
                <h3 className="font-display text-3xl uppercase tracking-tight">
                  Payment Successful!
                </h3>
                <p className="text-xs font-medium text-ink-soft">
                  Your <span className="font-bold text-ink">{paymentSuccess.planName}</span> plan is now active. Your Upload Access has been automatically unlocked.
                </p>

                <div className="rounded-lg border-2 border-ink bg-paper p-4 text-left font-mono text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Payment ID:</span>
                    <span className="font-bold">{paymentSuccess.paymentId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-faint">Expiry Date:</span>
                    <span className="font-bold">{paymentSuccess.expiryDate}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="w-full mt-4"
                  onClick={() => {
                    setSelectedPlan(null)
                    router.push('/dashboard/upload')
                  }}
                >
                  Head to Upload Wizard
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
