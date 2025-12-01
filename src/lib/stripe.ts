// Client-safe Stripe exports (tiers, limits, feature flags)
// Stripe server SDK usage has been moved to `stripe-server.ts` to avoid bundling
// server-only dependencies into client builds.

export { SUBSCRIPTION_TIERS, hasFeatureAccess, getQuotaLimit, getAIRequestLimit } from './subscription-tiers'
export type { SubscriptionTier } from './subscription-tiers'
