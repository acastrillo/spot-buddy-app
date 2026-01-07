import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';

/**
 * POST /api/user/onboarding
 * Mark onboarding as completed or skipped
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    const body = await req.json();
    const { completed, skipped } = body;

    // Update user in DynamoDB
    const updates: Record<string, any> = {
      onboardingCompleted: completed ?? true,
      onboardingCompletedAt: new Date().toISOString(),
    };

    if (skipped) {
      updates.onboardingSkipped = true;
    }

    await dynamoDBUsers.update(userId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Onboarding API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding status' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/onboarding
 * Check onboarding status
 */
export async function GET() {
  try {
    const auth = await getAuthenticatedUserId();
    if ('error' in auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = auth;

    const user = await dynamoDBUsers.get(userId);

    return NextResponse.json({
      completed: user?.onboardingCompleted || false,
      skipped: user?.onboardingSkipped || false,
    });
  } catch (error) {
    console.error('[Onboarding API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding status' },
      { status: 500 }
    );
  }
}
