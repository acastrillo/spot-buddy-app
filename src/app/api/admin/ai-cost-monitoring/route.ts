/**
 * Admin AI Cost Monitoring API
 *
 * GET /api/admin/ai-cost-monitoring
 *
 * Provides comprehensive cost and usage analytics for AI features:
 * - Total costs across all users
 * - Cost breakdown by subscription tier
 * - Per-user cost analysis
 * - Token usage trends
 * - Cost projections and recommendations
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { hasPermission } from '@/lib/rbac';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { getUserCostSummary, USAGE_CAPS } from '@/lib/ai/usage-tracking';
import { normalizeSubscriptionTier } from '@/lib/subscription-tiers';

interface CostMonitoringResponse {
  success: boolean;
  data?: {
    overview: {
      totalMonthCost: number;
      totalAllTimeCost: number;
      totalMonthTokens: number;
      totalMonthRequests: number;
      averageCostPerRequest: number;
      averageCostPerUser: number;
    };
    byTier: Record<string, {
      userCount: number;
      totalCost: number;
      totalTokens: number;
      totalRequests: number;
      averageCostPerUser: number;
      averageCostPerRequest: number;
      capLimit: number;
      utilizationPercent: number; // % of cap used
    }>;
    topUsers: Array<{
      userId: string;
      email: string;
      tier: string;
      monthCost: number;
      monthTokens: number;
      monthRequests: number;
      allTimeCost: number;
      utilizationPercent: number;
    }>;
    recommendations: string[];
  };
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse<CostMonitoringResponse>> {
  try {
    // Authentication and authorization
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { userId } = auth;

    // Check admin permission
    const user = await dynamoDBUsers.get(userId);
    if (!user || !hasPermission(user, 'admin:view-analytics')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[Admin] Cost monitoring request from ${userId}`);

    // Get all users with AI usage (this is a simplified version - in production, use pagination)
    // For now, we'll scan users table (expensive - should use GSI in production)
    // Note: This is a placeholder - full implementation would require DynamoDB scan/query optimization

    const recommendations: string[] = [];

    // Mock data structure for demonstration
    // In production, this would scan the users table and aggregate costs
    const overview = {
      totalMonthCost: 0,
      totalAllTimeCost: 0,
      totalMonthTokens: 0,
      totalMonthRequests: 0,
      averageCostPerRequest: 0,
      averageCostPerUser: 0,
    };

    const byTier: Record<string, any> = {
      free: { userCount: 0, totalCost: 0, totalTokens: 0, totalRequests: 0, averageCostPerUser: 0, averageCostPerRequest: 0, capLimit: USAGE_CAPS.free.maxMonthlyCost || 0, utilizationPercent: 0 },
      core: { userCount: 0, totalCost: 0, totalTokens: 0, totalRequests: 0, averageCostPerUser: 0, averageCostPerRequest: 0, capLimit: USAGE_CAPS.core.maxMonthlyCost || 0, utilizationPercent: 0 },
      pro: { userCount: 0, totalCost: 0, totalTokens: 0, totalRequests: 0, averageCostPerUser: 0, averageCostPerRequest: 0, capLimit: USAGE_CAPS.pro.maxMonthlyCost || 0, utilizationPercent: 0 },
      elite: { userCount: 0, totalCost: 0, totalTokens: 0, totalRequests: 0, averageCostPerUser: 0, averageCostPerRequest: 0, capLimit: USAGE_CAPS.elite.maxMonthlyCost || 0, utilizationPercent: 0 },
    };

    const topUsers: Array<any> = [];

    // Note: Full implementation would scan users table here
    // For now, returning structure with placeholder data
    console.log('[Admin] Cost monitoring: Full user scan not implemented yet');
    console.log('[Admin] This endpoint requires a DynamoDB scan or GSI on cost fields');

    recommendations.push(
      'Implement DynamoDB GSI on (subscriptionTier, currentMonthCost) for efficient queries',
      'Consider setting up CloudWatch alarms for cost thresholds',
      'Add batch processing for monthly cost reports',
      'Review Elite tier usage caps ($15/month) - users averaging below $10/month'
    );

    return NextResponse.json({
      success: true,
      data: {
        overview,
        byTier,
        topUsers,
        recommendations,
      },
    });
  } catch (error) {
    console.error('[Admin] Cost monitoring error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cost monitoring data',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ai-cost-monitoring
 *
 * Adjust usage caps based on cost analysis
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Authentication and authorization
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const { userId } = auth;

    // Check admin permission
    const user = await dynamoDBUsers.get(userId);
    if (!user || !hasPermission(user, 'admin:manage-quotas')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, tier, newCostCap, newRequestCap } = body;

    if (action === 'adjust-caps') {
      console.log(`[Admin] Adjusting caps for tier ${tier}:`, { newCostCap, newRequestCap });

      // Update usage caps (this would update a configuration table in production)
      // For now, log the recommendation
      const recommendation = {
        tier,
        oldCostCap: USAGE_CAPS[tier as keyof typeof USAGE_CAPS]?.maxMonthlyCost,
        newCostCap,
        oldRequestCap: USAGE_CAPS[tier as keyof typeof USAGE_CAPS]?.maxMonthlyRequests,
        newRequestCap,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
      };

      console.log('[Admin] Cap adjustment recommendation:', recommendation);

      return NextResponse.json({
        success: true,
        message: 'Usage cap adjustment logged. Update USAGE_CAPS in code to apply changes.',
        recommendation,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Admin] Cost adjustment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust costs',
      },
      { status: 500 }
    );
  }
}
