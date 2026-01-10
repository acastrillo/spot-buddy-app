/**
 * User AI Usage Dashboard API
 *
 * GET /api/user/ai-usage
 *
 * Returns user's current AI usage, costs, and quota information:
 * - Current month usage (requests, tokens, cost)
 * - All-time usage statistics
 * - Remaining quota
 * - Usage caps and limits
 * - Cost breakdown
 * - Recent usage history
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';
import {
  getUserCostSummary,
  checkUsageCap,
  getUserUsageLogs,
  USAGE_CAPS,
} from '@/lib/ai/usage-tracking';
import { getAIRequestLimit, normalizeSubscriptionTier } from '@/lib/subscription-tiers';

interface AIUsageResponse {
  success: boolean;
  data?: {
    subscriptionTier: string;
    currentMonth: {
      requests: number;
      requestsLimit: number;
      requestsRemaining: number;
      tokens: number;
      tokensLimit?: number;
      cost: number;
      costLimit?: number;
      costUSD: string; // Formatted cost
    };
    allTime: {
      requests: number;
      tokens: number;
      cost: number;
      costUSD: string;
    };
    usage: {
      requestsPercent: number; // 0-100
      tokensPercent: number;
      costPercent: number;
    };
    limits: {
      requestsPerMonth: number;
      tokensPerMonth?: number;
      costPerMonth?: number;
      warnThreshold: number; // % when to show warning
    };
    status: {
      canMakeRequest: boolean;
      isNearLimit: boolean; // Above warn threshold
      message?: string;
    };
    recentUsage: Array<{
      timestamp: string;
      operation: string;
      tokens: number;
      cost: number;
      success: boolean;
    }>;
    resetDate: string; // When quotas reset
  };
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<AIUsageResponse>> {
  try {
    // Authentication
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { userId } = auth;

    // Get user
    const user = await dynamoDBUsers.get(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const tier = normalizeSubscriptionTier(user.subscriptionTier);
    const requestLimit = getAIRequestLimit(tier);
    const caps = USAGE_CAPS[tier] || USAGE_CAPS.free;

    // Get cost summary
    const costSummary = await getUserCostSummary(userId);
    const currentMonthCost = costSummary?.currentMonthCost || 0;
    const currentMonthTokens = costSummary?.currentMonthTokens || 0;
    const currentMonthRequests = costSummary?.currentMonthRequests || 0;

    const totalCost = costSummary?.totalCost || 0;
    const totalTokens = costSummary?.totalTokens || 0;
    const totalRequests = costSummary?.totalRequests || 0;

    // Check usage caps
    const capCheck = await checkUsageCap(userId, tier);

    // Calculate percentages
    const requestsPercent = requestLimit > 0 ? (currentMonthRequests / requestLimit) * 100 : 0;
    const tokensPercent = caps.maxMonthlyTokens ? (currentMonthTokens / caps.maxMonthlyTokens) * 100 : 0;
    const costPercent = caps.maxMonthlyCost ? (currentMonthCost / caps.maxMonthlyCost) * 100 : 0;

    // Get recent usage logs (last 10 requests)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const usageLogs = await getUserUsageLogs(userId, monthStart, now.toISOString(), 10);

    const recentUsage = usageLogs.map(log => ({
      timestamp: log.timestamp,
      operation: log.operation,
      tokens: log.totalTokens,
      cost: log.totalCost,
      success: log.success,
    }));

    // Calculate reset date (first day of next month)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const resetDate = nextMonth.toISOString();

    // Determine status message
    let statusMessage: string | undefined;
    if (!capCheck.allowed) {
      statusMessage = capCheck.reason;
    } else if (capCheck.shouldWarn) {
      const maxPercent = Math.max(requestsPercent, tokensPercent, costPercent);
      statusMessage = `You've used ${maxPercent.toFixed(0)}% of your monthly AI quota`;
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionTier: tier,
        currentMonth: {
          requests: currentMonthRequests,
          requestsLimit: requestLimit,
          requestsRemaining: Math.max(0, requestLimit - currentMonthRequests),
          tokens: currentMonthTokens,
          tokensLimit: caps.maxMonthlyTokens,
          cost: currentMonthCost,
          costLimit: caps.maxMonthlyCost,
          costUSD: `$${currentMonthCost.toFixed(4)}`,
        },
        allTime: {
          requests: totalRequests,
          tokens: totalTokens,
          cost: totalCost,
          costUSD: `$${totalCost.toFixed(2)}`,
        },
        usage: {
          requestsPercent: Math.round(requestsPercent),
          tokensPercent: Math.round(tokensPercent),
          costPercent: Math.round(costPercent),
        },
        limits: {
          requestsPerMonth: caps.maxMonthlyRequests,
          tokensPerMonth: caps.maxMonthlyTokens,
          costPerMonth: caps.maxMonthlyCost,
          warnThreshold: caps.warnThreshold * 100, // Convert to percentage
        },
        status: {
          canMakeRequest: capCheck.allowed,
          isNearLimit: capCheck.shouldWarn,
          message: statusMessage,
        },
        recentUsage,
        resetDate,
      },
    });
  } catch (error) {
    console.error('[AI Usage] Error fetching usage:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch AI usage data',
      },
      { status: 500 }
    );
  }
}
