"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store"
import { Login } from "@/components/auth/login"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Trash2,
  ChevronRight,
  HelpCircle,
  Heart,
  TrendingUp,
  Activity,
  Crown,
  Target,
  CheckCircle,
  XCircle,
  Shield
} from "lucide-react"
import Link from "next/link"
import { SUBSCRIPTION_TIERS, normalizeSubscriptionTier, type SubscriptionTierInput } from "@/lib/subscription-tiers"
import { isAdmin } from "@/lib/rbac"

// Wrapper component to handle Suspense boundary for useSearchParams
function SettingsContent() {
  const { isAuthenticated, user } = useAuthStore()
  const { update: updateSession } = useSession()
  const searchParams = useSearchParams()
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [email, setEmail] = useState(user?.email || "")
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync form state with user data only when user ID changes (initial load or user switch)
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
      setEmail(user.email || "")
    }
  }, [user?.id])

  // Handle checkout success/cancel redirects from Stripe
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    const refreshSession = searchParams.get('refresh_session')

    if (success === 'true') {
      // Force session refresh to get updated subscription from DynamoDB
      updateSession()

      // If refresh_session param is present, do aggressive refresh
      if (refreshSession === 'true') {
        // Try refreshing multiple times with delays to ensure DB changes propagate
        setTimeout(() => updateSession(), 1000)
        setTimeout(() => updateSession(), 2000)
        setTimeout(() => {
          updateSession()
          // Reload the page after session updates to ensure fresh data
          window.location.reload()
        }, 3000)
      }

      setNotification({
        type: 'success',
        message: 'Subscription updated successfully! Your new plan is now active.'
      })
      // Clear URL params after handling
      window.history.replaceState({}, '', '/settings')
    } else if (canceled === 'true') {
      setNotification({
        type: 'error',
        message: 'Checkout was canceled. No changes were made to your subscription.'
      })
      window.history.replaceState({}, '', '/settings')
    }
  }, [searchParams, updateSession])

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Save profile changes
  const handleSaveProfile = async () => {
    if (isSaving) return

    setIsSaving(true)
    setNotification(null)

    try {
      // CRITICAL: Store expected values BEFORE making API call
      // We need to capture the values we're about to send, not the state after updates
      const sentFirstName = firstName.trim() || null
      const sentLastName = lastName.trim() || null

      console.log('[Settings] Saving profile:', { sentFirstName, sentLastName })

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: sentFirstName,
          lastName: sentLastName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      console.log('[Settings] API response:', data.user)

      // Show success message briefly before reload
      setNotification({
        type: 'success',
        message: 'Profile updated successfully!'
      })

      // Reload page immediately - NextAuth will fetch fresh session from DB
      // The page load will trigger JWT callback which reads firstName/lastName from DynamoDB
      console.log('[Settings] Profile saved to database, reloading to refresh session...')

      // Small delay to let user see the success message
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (error) {
      console.error('[Settings] Error updating profile:', error)
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update profile',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (isDeleting) return

    setIsDeleting(true)
    setNotification(null)

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      // Show success message briefly before redirecting
      setNotification({
        type: 'success',
        message: 'Account deleted successfully. Redirecting...',
      })

      // Sign out and redirect to home page
      setTimeout(() => {
        window.location.href = '/'
      }, 2000)
    } catch (error) {
      console.error('Error deleting account:', error)
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete account',
      })
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const currentTier = normalizeSubscriptionTier((user?.subscriptionTier ?? 'free') as SubscriptionTierInput)
  const tierConfig = SUBSCRIPTION_TIERS[currentTier]
  const userIsAdmin = user ? isAdmin(user as any) : false

  const settingsSections = [
    {
      title: "Subscription",
      items: [
        {
          icon: Crown,
          title: "Manage Subscription",
          subtitle: `Current plan: ${tierConfig.name}`,
          action: "chevron",
          href: "/subscription"
        }
      ]
    },
    ...(userIsAdmin ? [{
      title: "Administration",
      items: [
        {
          icon: Shield,
          title: "Admin Panel",
          subtitle: "Manage users, settings, and system logs",
          action: "chevron" as const,
          href: "/admin/users"
        }
      ]
    }] : []),
    {
      title: "Stats & Progress",
      items: [
        {
          icon: TrendingUp,
          title: "Personal Records",
          subtitle: "View your PRs and strength progression",
          action: "chevron",
          href: "/stats/prs"
        },
        {
          icon: Activity,
          title: "Body Metrics",
          subtitle: "Track weight, measurements, and body composition",
          action: "chevron",
          href: "/stats/metrics"
        },
        {
          icon: Target,
          title: "Training Profile",
          subtitle: "Set goals and preferences for AI-powered workouts",
          action: "chevron",
          href: "/settings/training-profile"
        }
      ]
    },
    {
      title: "Data",
      items: [
        {
          icon: Trash2,
          title: "Delete Account",
          subtitle: "Permanently remove your account",
          action: "button",
          destructive: true,
          onClick: "handleDeleteAccount"
        }
      ]
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          title: "Help & FAQ",
          subtitle: "Get help and find answers",
          action: "chevron"
        }
      ]
    }
  ]

  return (
    <>
      <Header />
      <main className="min-h-screen pb-20 md:pb-8 flex justify-center">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
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

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Settings
            </h1>
            <p className="text-text-secondary">
              Manage your account and app preferences
            </p>
          </div>

          <div className="space-y-8">
            {/* Profile Section */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Profile</CardTitle>
                <p className="text-sm text-text-secondary">Your personal information</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      First Name
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Last Name
                    </label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Email
                  </label>
                  <Input
                    value={email}
                    type="email"
                    disabled
                    className="bg-surface/30 cursor-not-allowed opacity-60"
                  />
                  <p className="text-xs text-text-secondary mt-2">
                    Contact support to change your email address
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="px-6"
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Settings Sections */}
            {settingsSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h2 className="text-lg font-semibold text-text-primary mb-4">
                  {section.title}
                </h2>
                <Card>
                  <CardContent className="p-0">
                    {section.items.map((item, itemIndex) => {
                      const Icon = item.icon
                      const buttonClasses = `w-full flex items-center justify-between p-4 text-left hover:bg-surface/50 transition-colors duration-200 ${
                        itemIndex !== section.items.length - 1 ? 'border-b border-border' : ''
                      } ${itemIndex === 0 ? 'rounded-t-xl' : ''} ${
                        itemIndex === section.items.length - 1 ? 'rounded-b-xl' : ''
                      }`

                      const content = (
                        <>
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                              (item as any).destructive ? 'bg-destructive/10' : 'bg-surface'
                            }`}>
                              <Icon className={`h-4 w-4 ${
                                (item as any).destructive ? 'text-destructive' : 'text-text-secondary'
                              }`} />
                            </div>
                            <div>
                              <h3 className={`font-medium ${
                                (item as any).destructive ? 'text-destructive' : 'text-text-primary'
                              }`}>
                                {item.title}
                              </h3>
                              <p className="text-sm text-text-secondary">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          {item.action === "chevron" && (
                            <ChevronRight className="h-4 w-4 text-text-secondary" />
                          )}
                        </>
                      )

                      return (item as any).href ? (
                        <Link key={itemIndex} href={(item as any).href} className={buttonClasses}>
                          {content}
                        </Link>
                      ) : (item as any).onClick === "handleDeleteAccount" ? (
                        <button
                          key={itemIndex}
                          className={buttonClasses}
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          {content}
                        </button>
                      ) : (
                        <button key={itemIndex} className={buttonClasses}>
                          {content}
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* App Info */}
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-2 text-text-secondary mb-2">
                <span className="font-semibold">Spotter</span>
              </div>
              <p className="text-sm text-text-secondary mb-1">Version 1.0.0 (Beta)</p>
              <div className="flex items-center justify-center space-x-1 text-xs text-text-secondary">
                <span>Made with</span>
                <Heart className="h-3 w-3 text-destructive fill-current" />
                <span>for fitness enthusiasts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Delete Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-text-secondary">
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <p className="text-text-secondary font-semibold">
                  All of your data, including workouts, stats, and personal records will be permanently deleted.
                </p>
                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <MobileNav />
    </>
  )
}

// Export the page with Suspense boundary for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
