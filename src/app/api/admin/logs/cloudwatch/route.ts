import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedSession } from '@/lib/api-auth';
import { dynamoDBUsers } from '@/lib/dynamodb';
import { hasPermission } from '@/lib/rbac';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

export const runtime = 'nodejs';

const cloudWatchClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

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
    const queryId = searchParams.get('queryId');
    const logGroup =
      searchParams.get('logGroup') ||
      process.env.CLOUDWATCH_LOG_GROUP ||
      '/ecs/spotter-app';

    if (queryId) {
      const results = await cloudWatchClient.send(
        new GetQueryResultsCommand({ queryId })
      );

      const logs = (results.results || []).map((row) => mapLogRow(row));
      const stats = results.statistics || {};

      return NextResponse.json({
        success: true,
        status: results.status || 'Running',
        queryId,
        logs: results.status === 'Complete' ? logs : undefined,
        statistics: {
          scannedEvents: Number(stats.recordsScanned || 0),
          matchedEvents: Number(stats.recordsMatched || 0),
        },
      });
    }

    const startTime = parseTimeParam(searchParams.get('startTime'));
    const endTime = parseTimeParam(searchParams.get('endTime'));
    const level = searchParams.get('level');
    const search = searchParams.get('search');

    if (!startTime || !endTime || endTime <= startTime) {
      return NextResponse.json(
        { success: false, error: 'Invalid startTime/endTime' },
        { status: 400 }
      );
    }

    const limit = clampLimit(searchParams.get('limit'));
    const queryString = buildInsightsQuery({ level, search, limit });

    const startResponse = await cloudWatchClient.send(
      new StartQueryCommand({
        logGroupName: logGroup,
        startTime,
        endTime,
        queryString,
        limit,
      })
    );

    return NextResponse.json({
      success: true,
      status: 'Running',
      queryId: startResponse.queryId || '',
      statistics: { scannedEvents: 0, matchedEvents: 0 },
    });
  } catch (error) {
    console.error('[Admin] CloudWatch logs error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

function clampLimit(limitParam: string | null): number {
  const limit = parseInt(limitParam || '100', 10);
  return Math.min(Math.max(limit, 1), 500);
}

function parseTimeParam(value: string | null): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) {
    const ms = numeric > 1e12 ? numeric : numeric * 1000;
    return Math.floor(ms / 1000);
  }
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return Math.floor(date.getTime() / 1000);
  }
  return null;
}

function escapeRegex(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');
}

function buildInsightsQuery(params: {
  level: string | null;
  search: string | null;
  limit: number;
}): string {
  const queryParts = ['fields @timestamp, @message, level, message, metadata'];
  const filters: string[] = [];

  if (params.level) {
    const level = params.level.toLowerCase();
    const levelUpper = level.toUpperCase();
    filters.push(
      `(level = \"${level}\" or @message like /${escapeRegex(levelUpper)}/)`
    );
  }

  if (params.search) {
    const escaped = escapeRegex(params.search);
    filters.push(`(@message like /${escaped}/ or message like /${escaped}/)`);
  }

  if (filters.length > 0) {
    queryParts.push(`| filter ${filters.join(' and ')}`);
  }

  queryParts.push('| sort @timestamp desc');
  queryParts.push(`| limit ${params.limit}`);

  return queryParts.join(' ');
}

function mapLogRow(row: Array<{ field?: string; value?: string }>) {
  const fields: Record<string, string> = {};
  row.forEach((entry) => {
    if (entry.field && entry.value !== undefined) {
      fields[entry.field] = entry.value;
    }
  });

  const rawMessage = fields.message || fields['@message'] || '';
  let level = fields.level || '';
  let message = rawMessage;
  let metadata: unknown = fields.metadata;

  if (fields.metadata) {
    try {
      metadata = JSON.parse(fields.metadata);
    } catch {
      metadata = fields.metadata;
    }
  }

  if (rawMessage) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (parsed && typeof parsed === 'object') {
        const parsedRecord = parsed as Record<string, unknown>;
        level = typeof parsedRecord.level === 'string' ? parsedRecord.level : level;
        message = typeof parsedRecord.message === 'string' ? parsedRecord.message : rawMessage;
        if (parsedRecord.metadata && !fields.metadata) {
          metadata = parsedRecord.metadata;
        }
      }
    } catch {
      // Non-JSON logs are expected.
    }
  }

  return {
    timestamp: fields['@timestamp'] || fields.timestamp || null,
    level: level || 'info',
    message,
    metadata,
  };
}
