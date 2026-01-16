import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, getDynamoDb } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/audit-log';
import { getRequestIp } from '@/lib/request-ip';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

export const runtime = 'nodejs';

interface ToggleBetaRequest {
  userId: string;
  isBeta: boolean;
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

    let body: ToggleBetaRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body?.userId || typeof body.isBeta !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'userId and isBeta are required' },
        { status: 400 }
      );
    }

    const targetUser = await dynamoDBUsers.get(body.userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    await getDynamoDb().send(
      new UpdateCommand({
        TableName: process.env.DYNAMODB_USERS_TABLE || 'spotter-users',
        Key: { id: body.userId },
        UpdateExpression: 'SET isBeta = :isBeta, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':isBeta': body.isBeta,
          ':updatedAt': now,
        },
      })
    );

    await writeAuditLog({
      action: 'admin.toggle-user-beta',
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      ipAddress: getRequestIp(req.headers),
      metadata: {
        isBeta: body.isBeta,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        isBeta: body.isBeta,
      },
    });
  } catch (error) {
    console.error('[Admin] Toggle beta error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
