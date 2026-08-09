import type { AccessPlanName } from '@/lib/types'

export interface PricingPlan {
  id: string
  name: AccessPlanName
  priceRupees: number
  priceFormatted: string
  durationLabel: string
  durationDays: number | null // null for Single Release (or 1 year / 365)
  popular?: boolean
  features: string[]
  releaseLimitLabel: string
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'single_release',
    name: 'Single Release',
    priceRupees: 99,
    priceFormatted: '₹99',
    durationLabel: '1 Single Release',
    durationDays: 365, // valid for 1 year or until used
    releaseLimitLabel: '1 Song Release',
    features: [
      '1 Song Release',
      'Distribution to 150+ Streaming Platforms',
      'Keep 80% Royalties',
      'Release Scheduling',
      'Artist Profile Mapping',
      'Basic Email Support',
      'Delivery in 3–5 Business Days',
    ],
  },
  {
    id: '1_month_unlimited',
    name: '1 Month Unlimited',
    priceRupees: 299,
    priceFormatted: '₹299',
    durationLabel: '1 Month',
    durationDays: 30,
    releaseLimitLabel: 'Unlimited Releases',
    features: [
      'Unlimited Song, EP & Album Releases',
      'Distribution to 150+ Streaming Platforms',
      'Keep 85% Royalties',
      'Release Scheduling',
      'YouTube Content ID',
      'Artist Profile Mapping',
      'Metadata Updates',
      'Basic Streaming Analytics',
      'Priority Email Support',
      'Faster Review',
    ],
  },
  {
    id: '6_months_unlimited',
    name: '6 Months Unlimited',
    priceRupees: 699,
    priceFormatted: '₹699',
    durationLabel: '6 Months',
    durationDays: 180,
    releaseLimitLabel: 'Unlimited Releases',
    features: [
      'Unlimited Song, EP & Album Releases',
      'Distribution to 150+ Streaming Platforms',
      'Keep 90% Royalties',
      'Release Scheduling',
      'YouTube Content ID',
      'Official Artist Profile Mapping',
      'Metadata Updates',
      'Streaming Analytics',
      'Priority Review',
      'Priority Support',
      'Takedown Requests',
    ],
  },
  {
    id: '1_year_unlimited',
    name: '1 Year Unlimited',
    priceRupees: 1499,
    priceFormatted: '₹1499',
    durationLabel: '1 Year',
    durationDays: 365,
    popular: true,
    releaseLimitLabel: 'Unlimited Releases',
    features: [
      'Unlimited Song, EP & Album Releases',
      'Distribution to 150+ Streaming Platforms',
      'Keep 94% Royalties',
      'Release Scheduling',
      'YouTube Content ID',
      'Official Artist Profile Mapping',
      'Unlimited Metadata Updates',
      'Advanced Streaming Analytics',
      'Release Strategy Support',
      'Priority Review',
      'Dedicated Priority Support',
      'Takedown Requests',
      'Release Transfer Assistance',
    ],
  },
]
