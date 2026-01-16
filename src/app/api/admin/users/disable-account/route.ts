import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, getDynamoDb } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/request-ip';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const runtime = 'nodejs';

interface DisableAccountRequest {
  userId: string;
  disabled: boolean;
  reason?: string;
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

    let body: DisableAccountRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body?.userId || typeof body.disabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'userId and disabled are required' },
        { status: 400 }
      );
    }

    if (body.disabled && body.userId === adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Cannot disable your own account' },
        { status: 400 }
      );
    }

    const targetUser = await dynamoDBUsers.get(body.userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const disabledAt = body.disabled ? now : null;
    const disabledBy = body.disabled ? adminUserId : null;
    const disabledReason = body.disabled ? (body.reason?.trim() || null) : null;

    await getDynamoDb().send(
      new UpdateCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE || 'spotter-users',
        Key: { id: body.userId },
        UpdateExpression:
          'SET isDisabled = :isDisabled, disabledAt = :disabledAt, disabledBy = :disabledBy, disabledReason = :disabledReason, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':isDisabled': body.disabled,
          ':disabledAt': disabledAt,
          ':disabledBy': disabledBy,
          ':disabledReason': disabledReason,
          ':updatedAt': now,
        },
      })
    );

    await writeAuditLog({
      action: body.disabled ? 'admin.disable-account' : 'admin.enable-account',
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      ipAddress: getRequestIp(req.headers),
      metadata: {
        disabled: body.disabled,
        reason: disabledReason,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        isDisabled: body.disabled,
      },
    });
  } catch (error) {
    console.error('[Admin] Disable account error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
