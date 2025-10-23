"use client"

import { Crown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

interface UpgradePromptProps {
  reason?: string
  feature?: string
  compact?: boolean
}

export function UpgradePrompt({ reason, feature, compact = false }: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="bg-primary/10 border border-primary rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary mb-1">
              Upgrade Required
            </p>
            <p className="text-xs text-text-secondary mb-3">
              {reason || 'This feature requires a paid subscription'}
            </p>
            <Link href="/subscription">
              <Button size="sm" className="w-full sm:w-auto">
                View Plans
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-primary">
      <CardHeader className="text-center pb-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Upgrade to Continue</CardTitle>
        <CardDescription className="text-base mt-2">
          {reason || `Unlock ${feature || 'this feature'} and more with a premium subscription`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Crown className="h-4 w-4 text-primary" />
            <span>Unlimited features</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Crown className="h-4 w-4 text-primary" />
            <span>Advanced analytics</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
            <Crown className="h-4 w-4 text-primary" />
            <span>AI-powered insights</span>
          </div>
        </div>
        <Link href="/subscription">
          <Button size="lg" className="w-full">
            View Subscription Plans
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
