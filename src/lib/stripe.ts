import Stripe from 'stripe'
import { SUBSCRIPTION_TIERS, hasFeatureAccess, getQuotaLimit } from './subscription-tiers'

// Re-export for backward compatibility
export { SUBSCRIPTION_TIERS, hasFeatureAccess, getQuotaLimit }
export type { SubscriptionTier } from './subscription-tiers'

// Only initialize Stripe on the server
if (typeof window === 'undefined') {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
  }
}

export const stripe = typeof window === 'undefined' && process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null as any // Will never be accessed on client
