import React from "react"
import { useAuthStore } from "@/store"
import { SUBSCRIPTION_TIERS, hasFeatureAccess, getQuotaLimit } from "./stripe"

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'elite'

export interface FeatureGateResult {
  allowed: boolean
  reason?: string
  tier?: SubscriptionTier
}

/**
 * Hook to check if user has access to a specific feature
 */
export function useFeatureAccess(feature: string): FeatureGateResult {
  const { user } = useAuthStore()
  const tier = (user?.subscriptionTier || 'free') as SubscriptionTier

  const allowed = hasFeatureAccess(tier, feature)

  if (!allowed) {
    return {
      allowed: false,
      reason: `This feature requires ${getMinimumTierForFeature(feature)} or higher`,
      tier,
    }
  }

  return { allowed: true, tier }
}

/**
 * Hook to check if user has quota remaining
 */
export function useQuotaCheck(quotaType: 'ocrQuotaWeekly' | 'workoutsMax' | 'aiRequestsMonthly'): FeatureGateResult {
  const { user } = useAuthStore()
  const tier = (user?.subscriptionTier || 'free') as SubscriptionTier

  const limit = getQuotaLimit(tier, quotaType)

  // Unlimited quota
  if (limit === null) {
    return { allowed: true, tier }
  }

  // Check current usage
  const currentUsage = quotaType === 'ocrQuotaWeekly'
    ? user?.ocrQuotaUsed || 0
    : quotaType === 'aiRequestsMonthly'
    ? (user as any)?.aiRequestsUsed || 0
    : user?.workoutsSaved || 0

  if (currentUsage >= limit) {
    return {
      allowed: false,
      reason: `You've reached your ${
        quotaType === 'ocrQuotaWeekly' ? 'OCR' :
        quotaType === 'aiRequestsMonthly' ? 'AI request' :
        'workout'
      } limit. Upgrade to continue.`,
      tier,
    }
  }

  return { allowed: true, tier }
}

/**
 * Get the minimum tier required for a feature
 */
function getMinimumTierForFeature(feature: string): string {
  const tiers: SubscriptionTier[] = ['free', 'starter', 'pro', 'elite']

  for (const tier of tiers) {
    if (hasFeatureAccess(tier, feature)) {
      return SUBSCRIPTION_TIERS[tier].name
    }
  }

  return 'Pro'
}

/**
 * Feature gate component props
 */
export interface FeatureGateProps {
  feature: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Component to gate features based on subscription tier
 */
export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const { allowed } = useFeatureAccess(feature)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Get tier color for UI
 */
export function getTierColor(tier: SubscriptionTier): string {
  switch (tier) {
    case 'free':
      return 'text-text-secondary'
    case 'starter':
      return 'text-secondary'
    case 'pro':
      return 'text-primary'
    case 'elite':
      return 'text-rest'
    default:
      return 'text-text-secondary'
  }
}

/**
 * Get tier badge styling
 */
export function getTierBadge(tier: SubscriptionTier): {
  label: string
  color: string
  bgColor: string
} {
  const config = SUBSCRIPTION_TIERS[tier]

  return {
    label: config.name,
    color: getTierColor(tier),
    bgColor: tier === 'free' ? 'bg-surface' :
             tier === 'starter' ? 'bg-secondary/10' :
             tier === 'pro' ? 'bg-primary/10' : 'bg-rest/10',
  }
}
