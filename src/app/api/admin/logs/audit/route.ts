import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, getDynamoDb } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export const runtime = 'nodejs';

interface AuditLogQuery {
  startTime?: string;
  endTime?: string;
  actorId?: string;
  action?: string;
  limit?: number;
  lastEvaluatedKey?: Record<string, any>;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedSession();
    if ('error' in auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: adminUserId } = auth;
    const adminUser = await dynamoDBUsers.get(adminUserId);
    if (!adminUser || !hasPermission(adminUser, 'admin:view-logs')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = parseQuery(searchParams);

    if (!query.startTime || !query.endTime) {
      return NextResponse.json(
        { success: false, error: 'startTime and endTime are required' },
        { status: 400 }
      );
    }

    const filterExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    expressionAttributeNames['#createdAt'] = 'createdAt';
    filterExpressions.push('#createdAt BETWEEN :start AND :end');
    expressionAttributeValues[':start'] = query.startTime;
    expressionAttributeValues[':end'] = query.endTime;

    if (query.actorId) {
      filterExpressions.push('actorId = :actorId');
      expressionAttributeValues[':actorId'] = query.actorId;
    }

    if (query.action) {
      expressionAttributeNames['#action'] = 'action';
      filterExpressions.push('#action = :action');
      expressionAttributeValues[':action'] = query.action;
    }

    const result = await getDynamoDb().send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_AUDIT_TABLE || 'spotter-audit-logs',
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: query.limit || 100,
        ExclusiveStartKey: query.lastEvaluatedKey,
      })
    );

    return NextResponse.json({
      success: true,
      logs: (result.Items || []) as Array<Record<string, any>>,
      pagination: {
        hasMore: !!result.LastEvaluatedKey,
        lastEvaluatedKey: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
          : undefined,
      },
    });
  } catch (error) {
    console.error('[Admin] Audit logs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function parseQuery(searchParams: URLSearchParams): AuditLogQuery {
  const query: AuditLogQuery = {};

  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  if (startTime) query.startTime = startTime;
  if (endTime) query.endTime = endTime;

  const actorId = searchParams.get('actorId');
  if (actorId) query.actorId = actorId;

  const action = searchParams.get('action');
  if (action) query.action = action;

  const limitParam = parseInt(searchParams.get('limit') || '100', 10);
  query.limit = Math.min(Math.max(limitParam, 1), 500);

  const lastKey = searchParams.get('lastEvaluatedKey');
  if (lastKey) {
    try {
      query.lastEvaluatedKey = JSON.parse(
        Buffer.from(lastKey, 'base64').toString('utf-8')
      );
    } catch (error) {
      console.error('[Admin] Invalid lastEvaluatedKey:', error);
    }
  }

  return query;
}
