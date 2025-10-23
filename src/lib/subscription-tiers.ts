// Subscription tiers and pricing configuration
// This file is safe to import on both client and server

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: [
      '1 OCR scan per month',
      '3 Instagram saves per week',
      '31 workouts maximum',
      'Basic workout tracking',
      'Calendar view',
      'Basic timers',
    ],
    limits: {
      ocrQuotaMonthly: 1,
      instagramSavesWeekly: 3,
      workoutsMax: 31,
      aiRequestsMonthly: 0, // No AI features on free tier
      aiFeatures: false,
      advancedAnalytics: false,
    },
  },
  starter: {
    name: 'Starter',
    price: 7.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER,
    features: [
      '3 OCR scans per week',
      '5 Instagram saves per week',
      'Unlimited workouts',
      '10 AI requests per month',
      'Basic analytics',
      'PRs tracking',
      'Body metrics',
    ],
    limits: {
      ocrQuotaWeekly: 3,
      instagramSavesWeekly: 5,
      workoutsMax: null, // Unlimited
      aiRequestsMonthly: 10,
      aiFeatures: true,
      advancedAnalytics: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 14.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO,
    features: [
      '5 OCR scans per week',
      '7 Instagram saves per week',
      'Unlimited workouts',
      '30 AI requests per month',
      'AI workout features',
      'Crew features',
      'Advanced analytics',
    ],
    limits: {
      ocrQuotaWeekly: 5,
      instagramSavesWeekly: 7,
      workoutsMax: null,
      aiRequestsMonthly: 30,
      aiFeatures: true,
      advancedAnalytics: true,
      crewFeatures: true,
    },
  },
  elite: {
    name: 'Elite',
    price: 34.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || process.env.STRIPE_PRICE_ELITE,
    features: [
      '10 workout image saves per week',
      '12 Instagram saves per week',
      'Unlimited workouts',
      '100 AI requests per month',
      'AI workout features',
      'Advanced analytics',
      'Priority support',
    ],
    limits: {
      ocrQuotaWeekly: 10,
      instagramSavesWeekly: 12,
      workoutsMax: null,
      aiRequestsMonthly: 100,
      aiFeatures: true,
      advancedAnalytics: true,
      socialFeatures: true,
      prioritySupport: true,
    },
  },
} as const

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS

// Helper to check if user has access to a feature
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: keyof typeof SUBSCRIPTION_TIERS.pro.limits
): boolean {
  const tierLimits = SUBSCRIPTION_TIERS[tier].limits as any
  return tierLimits[feature] === true || tierLimits[feature] === null
}

// Helper to get quota limit for a tier
export function getQuotaLimit(tier: SubscriptionTier, quota: 'ocrQuotaWeekly' | 'ocrQuotaMonthly' | 'instagramSavesWeekly' | 'workoutsMax' | 'aiRequestsMonthly'): number | null {
  return SUBSCRIPTION_TIERS[tier].limits[quota] ?? null
}

// Helper to get AI request limit for a tier
export function getAIRequestLimit(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIERS[tier].limits.aiRequestsMonthly ?? 0
}
