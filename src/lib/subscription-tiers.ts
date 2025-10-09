// Subscription tiers and pricing configuration
// This file is safe to import on both client and server

export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price for free tier
    features: [
      '2 OCR scans per week',
      '50 workouts maximum',
      'Basic workout tracking',
      'Calendar view',
      'Basic timers',
    ],
    limits: {
      ocrQuotaWeekly: 2,
      instagramSavesWeekly: 0,
      workoutsMax: 50,
      aiFeatures: false,
      advancedAnalytics: false,
    },
  },
  starter: {
    name: 'Starter',
    price: 4.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_STARTER,
    features: [
      '3 OCR scans per week',
      '3 Instagram saves per week',
      'Unlimited workouts',
      'Basic analytics',
      'PRs tracking',
      'Body metrics',
    ],
    limits: {
      ocrQuotaWeekly: 3,
      instagramSavesWeekly: 3,
      workoutsMax: null, // Unlimited
      aiFeatures: false,
      advancedAnalytics: false,
    },
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || process.env.STRIPE_PRICE_PRO,
    features: [
      '5 OCR scans per week',
      '5 Instagram saves per week',
      'Unlimited workouts',
      'AI workout features',
      'Crew features',
      'Advanced analytics',
    ],
    limits: {
      ocrQuotaWeekly: 5,
      instagramSavesWeekly: 5,
      workoutsMax: null,
      aiFeatures: true,
      advancedAnalytics: true,
      crewFeatures: true,
    },
  },
  elite: {
    name: 'Elite',
    price: 19.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || process.env.STRIPE_PRICE_ELITE,
    features: [
      '10 workout image saves per week',
      '10 Instagram saves per week',
      'Unlimited workouts',
      'AI workout features',
      'Advanced analytics',
      'Priority support',
    ],
    limits: {
      ocrQuotaWeekly: 10,
      instagramSavesWeekly: 10,
      workoutsMax: null,
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
export function getQuotaLimit(tier: SubscriptionTier, quota: 'ocrQuotaWeekly' | 'instagramSavesWeekly' | 'workoutsMax'): number | null {
  return SUBSCRIPTION_TIERS[tier].limits[quota]
}
