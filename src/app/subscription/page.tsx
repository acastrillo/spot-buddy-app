"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Loader2, Crown, Zap, Sparkles, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { SUBSCRIPTION_TIERS } from "@/lib/stripe"

export default function SubscriptionPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuthStore()
  const { update: updateSession } = useSession()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Force refresh subscription data from server
  const refreshSubscription = useCallback(async () => {
    setIsRefreshing(true)
    await updateSession()
    // Small delay to allow UI to update
    setTimeout(() => setIsRefreshing(false), 1000)
  }, [updateSession])

  // Handle checkout success/cancel redirects from Stripe
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')

    if (success === 'true') {
      // Force session refresh to get updated subscription from DynamoDB
      // Add small delay to allow webhook to process
      setTimeout(() => {
        updateSession()
        setNotification({
          type: 'success',
          message: 'Subscription updated successfully! Your new plan is now active.'
        })
      }, 1000)
      // Clear URL params after handling
      window.history.replaceState({}, '', '/subscription')
    } else if (canceled === 'true') {
      setNotification({
        type: 'error',
        message: 'Checkout was canceled. No changes were made to your subscription.'
      })
      window.history.replaceState({}, '', '/subscription')
    }
  }, [searchParams, updateSession])

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  if (!isAuthenticated) {
    return <Login />
  }

  const currentTier = user?.subscriptionTier || 'free'

  const handleSubscribe = async (tier: string) => {
    setLoading(tier)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session. Please try again.')
        setLoading(null)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('An error occurred. Please try again.')
      setLoading(null)
    }
  }

  const handleManageSubscription = async () => {
    setLoading('portal')
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Failed to open billing portal. Please try again.')
        setLoading(null)
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('An error occurred. Please try again.')
      setLoading(null)
    }
  }

  const tiers = [
    {
      key: 'free',
      icon: Zap,
      color: 'text-text-secondary',
      bgColor: 'bg-surface',
      ...SUBSCRIPTION_TIERS.free,
    },
    {
      key: 'starter',
      icon: Sparkles,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      ...SUBSCRIPTION_TIERS.starter,
    },
    {
      key: 'pro',
      icon: Crown,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      popular: true,
      ...SUBSCRIPTION_TIERS.pro,
    },
    {
      key: 'elite',
      icon: Crown,
      color: 'text-rest',
      bgColor: 'bg-rest/10',
      ...SUBSCRIPTION_TIERS.elite,
    },
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          {/* Notification Banner */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-success/10 border border-success text-success'
                : 'bg-destructive/10 border border-destructive text-destructive'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span className="font-medium">{notification.message}</span>
              <button
                onClick={() => setNotification(null)}
                className="ml-auto text-current hover:opacity-70"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Upgrade your fitness journey with advanced features, unlimited tracking, and AI-powered insights
            </p>
          </div>

          {/* Current Subscription Banner */}
          {currentTier !== 'free' && (
            <Card className="mb-8 border-primary">
              <CardContent className="p-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      Current Plan: {SUBSCRIPTION_TIERS[currentTier as keyof typeof SUBSCRIPTION_TIERS].name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Status: {user?.subscriptionStatus || 'Active'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshSubscription}
                      disabled={isRefreshing}
                      title="Refresh subscription status"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleManageSubscription}
                      disabled={loading === 'portal'}
                    >
                      {loading === 'portal' ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Manage Subscription'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pricing Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => {
              const Icon = tier.icon
              const isCurrent = currentTier === tier.key
              const isUpgrade = ['free', 'starter', 'pro', 'elite'].indexOf(tier.key) >
                ['free', 'starter', 'pro', 'elite'].indexOf(currentTier)

              return (
                <Card
                  key={tier.key}
                  className={`relative ${
                    tier.popular ? 'border-primary shadow-lg scale-105' : ''
                  } ${isCurrent ? 'border-2 border-success' : ''}`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-success text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className={`w-12 h-12 ${tier.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`h-6 w-6 ${tier.color}`} />
                    </div>
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <CardDescription className="text-3xl font-bold text-text-primary mt-2">
                      {tier.price === 0 ? 'Free' : `$${tier.price}`}
                      {tier.price > 0 && <span className="text-sm text-text-secondary font-normal">/month</span>}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-text-secondary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {tier.key === 'free' ? (
                      <Button variant="outline" disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : isCurrent ? (
                      <Button variant="outline" onClick={handleManageSubscription} className="w-full">
                        Manage
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(tier.key)}
                        disabled={loading === tier.key}
                      >
                        {loading === tier.key ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Upgrade'
                        )}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Downgrade
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* FAQ Section */}
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-text-primary mb-2">Can I cancel anytime?</h4>
                <p className="text-sm text-text-secondary">
                  Yes! You can cancel your subscription at any time. You'll retain access to paid features until the end of your billing period.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-2">What payment methods do you accept?</h4>
                <p className="text-sm text-text-secondary">
                  We accept all major credit cards (Visa, Mastercard, American Express) through Stripe.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-2">Can I upgrade or downgrade my plan?</h4>
                <p className="text-sm text-text-secondary">
                  Yes! You can upgrade at any time and you'll be prorated for the remaining time. Downgrades take effect at the end of your billing period.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </>
  )
}
