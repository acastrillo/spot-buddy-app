'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Lock } from 'lucide-react';
import { useFeatureAccess, useQuotaCheck } from '@/lib/feature-gating';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EnhanceWithAIButtonProps {
  workoutId: string;
  onEnhanced?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  enhancementType?: 'full' | 'format' | 'details' | 'optimize';
  showQuota?: boolean;
  aiEnhanced?: boolean;
}

export function EnhanceWithAIButton({
  workoutId,
  onEnhanced,
  variant = 'default',
  size = 'default',
  className = '',
  enhancementType = 'full',
  showQuota = true,
  aiEnhanced = false,
}: EnhanceWithAIButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check feature access and quota
  const featureAccess = useFeatureAccess('aiFeatures');
  const quotaCheck = useQuotaCheck('aiRequestsMonthly');

  const handleEnhance = async () => {
    // Warn if workout already enhanced
    if (aiEnhanced) {
      const confirmed = confirm(
        '⚠️ This workout has already been enhanced with AI.\n\n' +
        'Enhancing again will overwrite the previous AI improvements and use another AI credit.\n\n' +
        'Are you sure you want to continue?'
      );

      if (!confirmed) {
        return;
      }
    }
    // Check if user has access to AI features
    if (!featureAccess.allowed) {
      router.push('/subscription?reason=ai_enhancement');
      return;
    }

    // Check if user has quota remaining
    if (!quotaCheck.allowed) {
      router.push('/subscription?reason=ai_quota_exceeded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/enhance-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, enhancementType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enhance workout');
      }

      console.log('[AI Enhance] Success:', data);
      console.log('[AI Enhance] Cost:', data.cost);
      console.log('[AI Enhance] Quota remaining:', data.quotaRemaining);

      // Refresh the page or call callback
      if (onEnhanced) {
        onEnhanced();
      } else {
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[AI Enhance] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // If no access, show upgrade button
  if (!featureAccess.allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={className}
              onClick={() => router.push('/subscription?reason=ai_enhancement')}
            >
              <Lock className="w-4 h-4 mr-2" />
              Enhance with AI
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{featureAccess.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // If no quota, show upgrade button
  if (!quotaCheck.allowed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={variant}
              size={size}
              className={className}
              onClick={() => router.push('/subscription?reason=ai_quota_exceeded')}
            >
              <Lock className="w-4 h-4 mr-2" />
              Enhance with AI (Quota Exceeded)
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{quotaCheck.reason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleEnhance}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enhancing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Enhance with AI
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
