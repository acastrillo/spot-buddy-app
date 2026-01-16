import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, getDynamoDb } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/request-ip';
import { normalizeSubscriptionTier } from '@/lib/subscription-tiers';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const runtime = 'nodejs';

interface ChangeTierRequest {
  userId: string;
  newTier: 'free' | 'core' | 'pro' | 'elite';
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: adminUserId } = auth;
    const adminUser = await dynamoDBUsers.get(adminUserId);
    if (!adminUser || !hasPermission(adminUser, 'admin:manage-users')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    let body: ChangeTierRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body?.userId || !body?.newTier) {
      return NextResponse.json(
        { success: false, error: 'userId and newTier are required' },
        { status: 400 }
      );
    }

    if (!['free', 'core', 'pro', 'elite'].includes(body.newTier)) {
      return NextResponse.json(
        { success: false, error: 'Invalid newTier' },
        { status: 400 }
      );
    }
    const newTier = normalizeSubscriptionTier(body.newTier);

    const targetUser = await dynamoDBUsers.get(body.userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const warnings: string[] = [];
    if (targetUser.stripeSubscriptionId) {
      warnings.push('User has an active Stripe subscription. Manual tier changes may be overwritten by Stripe webhooks.');
    }

    const now = new Date().toISOString();
    await getDynamoDb().send(
      new UpdateCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE || 'spotter-users',
        Key: { id: targetUser.id },
        UpdateExpression: 'SET subscriptionTier = :tier, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':tier': newTier,
          ':updatedAt': now,
        },
      })
    );

    await writeAuditLog({
      action: 'admin.change-tier',
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      ipAddress: getRequestIp(req.headers),
      metadata: {
        previousTier: targetUser.subscriptionTier,
        newTier,
        stripeSubscriptionId: targetUser.stripeSubscriptionId ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        subscriptionTier: newTier,
        stripeSubscriptionId: targetUser.stripeSubscriptionId ?? null,
      },
    });
  } catch (error) {
    console.error('[Admin] Change tier error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
