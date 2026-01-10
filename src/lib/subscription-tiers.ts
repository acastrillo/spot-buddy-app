// Subscription tiers and pricing configuration
// This file is safe to import on both client and server
// Updated: December 2024 - New 3-tier structure with annual pricing

const coreTier = {
  name: 'Core',
  price: 8.99,
  annualPrice: 69.99, // $5.83/month when billed annually (22% discount)
  // Server-side env vars (runtime) take priority over NEXT_PUBLIC (build-time)
  priceId: process.env.STRIPE_PRICE_CORE || process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE,
  annualPriceId: process.env.STRIPE_PRICE_CORE_ANNUAL || process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE_ANNUAL,
  features: [
    'Unlimited workouts',
    '3 Instagram imports per week',
    '10 AI requests per month',
    'Unlimited history',
    'PR tracking',
    'Body metrics',
    'Basic analytics',
    'Calendar scheduling',
  ],
  limits: {
    workoutsWeekly: null, // Unlimited
    instagramSavesWeekly: 3, // 3 per week
    workoutsMax: null, // Unlimited
    aiRequestsMonthly: 10,
    historyDays: null, // Unlimited
    aiFeatures: true,
    advancedAnalytics: false,
    ocrQuotaWeekly: 10,
  },
} as const

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    annualPrice: 0,
    priceId: null, // No Stripe price for free tier
    annualPriceId: null,
    features: [
      '3 workouts per week',
      '1 Instagram import per month',
      '1 AI request per month',
      '90-day history',
      'Basic workout tracking',
      'Calendar view',
      'Basic timers',
    ],
    limits: {
      workoutsWeekly: 3, // 3 workouts per week
      instagramSavesMonthly: 1, // 1 Instagram import per month
      workoutsMax: null, // No total limit, just weekly
      aiRequestsMonthly: 1, // 1 AI request per month to try the feature
      historyDays: 90, // 90-day history limit
      aiFeatures: true, // Limited AI access (1/month)
      advancedAnalytics: false,
      ocrQuotaWeekly: 2,
    },
  },
  core: coreTier,
  pro: {
    name: 'Pro',
    price: 13.99,
    annualPrice: 109.99, // $9.17/month when billed annually (21% discount)
    // Server-side env vars (runtime) take priority over NEXT_PUBLIC (build-time)
    priceId: process.env.STRIPE_PRICE_PRO || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
    annualPriceId: process.env.STRIPE_PRICE_PRO_ANNUAL || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
    features: [
      'Everything in Core',
      'Unlimited Instagram imports',
      '30 AI requests per month',
      'Advanced analytics',
      'Volume trends & PR progression',
      '1RM calculations',
      'Workout templates',
      'Export data',
    ],
    limits: {
      workoutsWeekly: null, // Unlimited
      instagramSavesWeekly: null, // Unlimited
      workoutsMax: null,
      aiRequestsMonthly: 30,
      historyDays: null, // Unlimited
      aiFeatures: true,
      advancedAnalytics: true,
      workoutTemplates: true,
      dataExport: true,
      ocrQuotaWeekly: null,
    },
  },
  elite: {
    name: 'Elite',
    price: 24.99,
    annualPrice: 199.99, // $16.67/month when billed annually (20% discount)
    // Server-side env vars (runtime) take priority over NEXT_PUBLIC (build-time)
    priceId: process.env.STRIPE_PRICE_ELITE || process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE,
    annualPriceId: process.env.STRIPE_PRICE_ELITE_ANNUAL || process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_ANNUAL,
    features: [
      'Everything in Pro',
      '100 AI requests per month',
      'Priority support (24-hour response)',
      'Early access to new features',
      'Custom workout templates',
      'API access (coming soon)',
      'Workout sharing features',
    ],
    limits: {
      workoutsWeekly: null, // Unlimited
      instagramSavesWeekly: null, // Unlimited
      workoutsMax: null,
      aiRequestsMonthly: 100,
      historyDays: null, // Unlimited
      aiFeatures: true,
      advancedAnalytics: true,
      prioritySupport: true,
      earlyAccess: true,
      customTemplates: true,
      apiAccess: false, // Coming soon
      workoutSharing: true,
      ocrQuotaWeekly: null,
    },
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS
export type SubscriptionTierInput = SubscriptionTier | 'starter' | string | null | undefined

export function normalizeSubscriptionTier(tier: SubscriptionTierInput): SubscriptionTier {
  if (!tier) return 'free'
  if (tier === 'starter') return 'core'
  // Type guard: check if tier is a valid key in SUBSCRIPTION_TIERS
  if (Object.prototype.hasOwnProperty.call(SUBSCRIPTION_TIERS, tier)) {
    return tier as SubscriptionTier
  }
  return 'free'
}

// Type for all possible limit keys across all tiers
export type LimitKey = keyof typeof SUBSCRIPTION_TIERS.free.limits |
  keyof typeof SUBSCRIPTION_TIERS.core.limits |
  keyof typeof SUBSCRIPTION_TIERS.pro.limits |
  keyof typeof SUBSCRIPTION_TIERS.elite.limits

// Helper to check if user has access to a feature
export function hasFeatureAccess(
  tier: SubscriptionTierInput,
  feature: LimitKey
): boolean {
  const normalizedTier = normalizeSubscriptionTier(tier)
  const tierLimits = SUBSCRIPTION_TIERS[normalizedTier].limits as Record<string, unknown>
  const value = tierLimits[feature]
  return value === true || value === null
}

// Helper to get quota limit for a tier
export function getQuotaLimit(
  tier: SubscriptionTierInput,
  quota:
    | 'workoutsWeekly'
    | 'instagramSavesWeekly'
    | 'instagramSavesMonthly'
    | 'workoutsMax'
    | 'aiRequestsMonthly'
    | 'historyDays'
    | 'ocrQuotaWeekly'
): number | null {
  const normalizedTier = normalizeSubscriptionTier(tier)
  const tierLimits = SUBSCRIPTION_TIERS[normalizedTier].limits as Record<string, number | null | boolean | undefined>
  const value = tierLimits[quota]
  if (typeof value === 'number' || value === null) {
    return value
  }
  return null
}

// Helper to get AI request limit for a tier
export function getAIRequestLimit(tier: SubscriptionTierInput): number {
  const normalizedTier = normalizeSubscriptionTier(tier)
  return SUBSCRIPTION_TIERS[normalizedTier].limits.aiRequestsMonthly ?? 0
}
