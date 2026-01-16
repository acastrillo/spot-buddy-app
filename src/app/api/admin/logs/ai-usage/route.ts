import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers, getDynamoDb } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

export const runtime = 'nodejs';

interface AIUsageQuery {
  startTime?: string;
  endTime?: string;
  userId?: string;
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

    expressionAttributeNames['#timestamp'] = 'timestamp';
    filterExpressions.push('#timestamp BETWEEN :start AND :end');
    expressionAttributeValues[':start'] = query.startTime;
    expressionAttributeValues[':end'] = query.endTime;

    if (query.userId) {
      filterExpressions.push('userId = :userId');
      expressionAttributeValues[':userId'] = query.userId;
    }

    const result = await getDynamoDb().send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_AI_USAGE_TABLE || 'spotter-ai-usage',
        FilterExpression: filterExpressions.join(' AND '),
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        Limit: query.limit || 100,
        ExclusiveStartKey: query.lastEvaluatedKey,
      })
    );

    const rawLogs = (result.Items || []) as Array<Record<string, any>>;
    const logs = rawLogs.map((log) => ({
      userId: log.userId,
      timestamp: log.timestamp,
      inputTokens: Number(log.inputTokens || 0),
      outputTokens: Number(log.outputTokens || 0),
      cost: Number(log.totalCost || log.cost || 0),
    }));

    const summary = rawLogs.reduce(
      (acc, log) => {
        acc.totalCost += Number(log.totalCost || 0);
        acc.totalTokens += Number(log.totalTokens || 0);
        acc.totalRequests += 1;
        return acc;
      },
      { totalCost: 0, totalTokens: 0, totalRequests: 0 }
    );

    return NextResponse.json({
      success: true,
      logs,
      summary,
      pagination: {
        hasMore: !!result.LastEvaluatedKey,
        lastEvaluatedKey: result.LastEvaluatedKey
          ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
          : undefined,
      },
    });
  } catch (error) {
    console.error('[Admin] AI usage logs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function parseQuery(searchParams: URLSearchParams): AIUsageQuery {
  const query: AIUsageQuery = {};

  const startTime = searchParams.get('startTime');
  const endTime = searchParams.get('endTime');
  if (startTime) query.startTime = startTime;
  if (endTime) query.endTime = endTime;

  const userId = searchParams.get('userId');
  if (userId) query.userId = userId;

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
