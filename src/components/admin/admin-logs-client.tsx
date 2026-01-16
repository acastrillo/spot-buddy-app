'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogFilters, type LogFiltersState } from './log-filters';
import { LogsTable } from './logs-table';

interface CloudWatchLogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: unknown;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AIUsageEntry {
  userId: string;
  timestamp: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface PaginationState {
  hasMore: boolean;
  lastEvaluatedKey?: string;
}

const defaultEnd = toInputValue(new Date());
const defaultStart = toInputValue(new Date(Date.now() - 60 * 60 * 1000));

export function AdminLogsClient() {
  const [activeTab, setActiveTab] = useState<'cloudwatch' | 'audit' | 'ai'>('cloudwatch');

  const [cloudwatchFilters, setCloudwatchFilters] = useState<LogFiltersState>({
    startTime: defaultStart,
    endTime: defaultEnd,
    level: '',
    search: '',
  });
  const [cloudwatchLogs, setCloudwatchLogs] = useState<CloudWatchLogEntry[]>([]);
  const [cloudwatchLoading, setCloudwatchLoading] = useState(false);
  const [cloudwatchStatus, setCloudwatchStatus] = useState('Idle');
  const [cloudwatchError, setCloudwatchError] = useState<string | null>(null);
  const [cloudwatchStats, setCloudwatchStats] = useState<{ scannedEvents: number; matchedEvents: number } | null>(null);

  const [auditFilters, setAuditFilters] = useState<LogFiltersState>({
    startTime: defaultStart,
    endTime: defaultEnd,
    actorId: '',
    action: '',
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditPagination, setAuditPagination] = useState<PaginationState>({ hasMore: false });

  const [aiFilters, setAiFilters] = useState<LogFiltersState>({
    startTime: defaultStart,
    endTime: defaultEnd,
    userId: '',
  });
  const [aiLogs, setAiLogs] = useState<AIUsageEntry[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPagination, setAiPagination] = useState<PaginationState>({ hasMore: false });

  const cloudwatchRows = useMemo(() => {
    return cloudwatchLogs.map((log) => {
      const hasMetadata = log.metadata !== undefined && log.metadata !== null;
      return {
        timestamp: formatTimestamp(log.timestamp),
        level: (
          <Badge className={getLevelBadgeColor(log.level)}>{log.level}</Badge>
        ),
        message: (
          <div className="space-y-1">
            <div className="text-sm text-gray-900">{log.message}</div>
            {hasMetadata && (
              <pre className="text-xs text-gray-500 whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            )}
          </div>
        ),
      };
    });
  }, [cloudwatchLogs]);

  const auditRows = useMemo(() => {
    return auditLogs.map((log) => ({
      timestamp: formatTimestamp(log.createdAt),
      action: log.action,
      actorId: log.actorId,
      targetId: log.targetId || '—',
      metadata: log.metadata ? (
        <pre className="text-xs text-gray-500 whitespace-pre-wrap">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      ) : (
        '—'
      ),
    }));
  }, [auditLogs]);

  const aiRows = useMemo(() => {
    return aiLogs.map((log) => ({
      timestamp: formatTimestamp(log.timestamp),
      userId: log.userId,
      inputTokens: log.inputTokens.toLocaleString(),
      outputTokens: log.outputTokens.toLocaleString(),
      cost: `$${log.cost.toFixed(4)}`,
    }));
  }, [aiLogs]);

  const runCloudwatchQuery = async () => {
    setCloudwatchLoading(true);
    setCloudwatchError(null);
    setCloudwatchLogs([]);
    setCloudwatchStats(null);

    const startIso = toIsoString(cloudwatchFilters.startTime);
    const endIso = toIsoString(cloudwatchFilters.endTime);
    if (!startIso || !endIso) {
      setCloudwatchError('Invalid time range');
      setCloudwatchLoading(false);
      return;
    }

    const params = new URLSearchParams({
      startTime: startIso,
      endTime: endIso,
      limit: '200',
    });

    if (cloudwatchFilters.level) {
      params.set('level', cloudwatchFilters.level);
    }

    if (cloudwatchFilters.search) {
      params.set('search', cloudwatchFilters.search);
    }

    try {
      const response = await fetch(`/api/admin/logs/cloudwatch?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to start log query');
      }

      setCloudwatchStatus(data.status || 'Running');
      await pollCloudwatch(data.queryId, 0);
    } catch (error) {
      setCloudwatchError(error instanceof Error ? error.message : 'Failed to start log query');
      setCloudwatchLoading(false);
    }
  };

  const pollCloudwatch = async (queryId: string, attempt: number) => {
    if (!queryId) {
      setCloudwatchError('Missing query ID');
      setCloudwatchLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/logs/cloudwatch?queryId=${queryId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch query results');
      }

      setCloudwatchStatus(data.status || 'Running');
      if (data.statistics) {
        setCloudwatchStats({
          scannedEvents: data.statistics.scannedEvents || 0,
          matchedEvents: data.statistics.matchedEvents || 0,
        });
      }

      if (data.status === 'Complete') {
        setCloudwatchLogs(data.logs || []);
        setCloudwatchLoading(false);
        return;
      }

      if (data.status === 'Failed') {
        setCloudwatchError('CloudWatch query failed');
        setCloudwatchLoading(false);
        return;
      }

      if (attempt >= 15) {
        setCloudwatchError('CloudWatch query timed out');
        setCloudwatchLoading(false);
        return;
      }

      setTimeout(() => {
        pollCloudwatch(queryId, attempt + 1);
      }, 1000);
    } catch (error) {
      setCloudwatchError(error instanceof Error ? error.message : 'Failed to fetch query results');
      setCloudwatchLoading(false);
    }
  };

  const runAuditQuery = async (append = false) => {
    setAuditLoading(true);
    setAuditError(null);

    const startIso = toIsoString(auditFilters.startTime);
    const endIso = toIsoString(auditFilters.endTime);
    if (!startIso || !endIso) {
      setAuditError('Invalid time range');
      setAuditLoading(false);
      return;
    }

    const params = new URLSearchParams({
      startTime: startIso,
      endTime: endIso,
      limit: '200',
    });

    if (auditFilters.actorId) params.set('actorId', auditFilters.actorId);
    if (auditFilters.action) params.set('action', auditFilters.action);
    if (append && auditPagination.lastEvaluatedKey) {
      params.set('lastEvaluatedKey', auditPagination.lastEvaluatedKey);
    }

    try {
      const response = await fetch(`/api/admin/logs/audit?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load audit logs');
      }

      setAuditLogs((prev) => (append ? [...prev, ...(data.logs || [])] : data.logs || []));
      setAuditPagination({
        hasMore: data.pagination?.hasMore || false,
        lastEvaluatedKey: data.pagination?.lastEvaluatedKey,
      });
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  const runAiQuery = async (append = false) => {
    setAiLoading(true);
    setAiError(null);

    const startIso = toIsoString(aiFilters.startTime);
    const endIso = toIsoString(aiFilters.endTime);
    if (!startIso || !endIso) {
      setAiError('Invalid time range');
      setAiLoading(false);
      return;
    }

    const params = new URLSearchParams({
      startTime: startIso,
      endTime: endIso,
      limit: '200',
    });

    if (aiFilters.userId) params.set('userId', aiFilters.userId);
    if (append && aiPagination.lastEvaluatedKey) {
      params.set('lastEvaluatedKey', aiPagination.lastEvaluatedKey);
    }

    try {
      const response = await fetch(`/api/admin/logs/ai-usage?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load AI usage logs');
      }

      setAiLogs((prev) => (append ? [...prev, ...(data.logs || [])] : data.logs || []));
      setAiPagination({
        hasMore: data.pagination?.hasMore || false,
        lastEvaluatedKey: data.pagination?.lastEvaluatedKey,
      });
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Failed to load AI usage logs');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
      <TabsList className="mb-6">
        <TabsTrigger value="cloudwatch">Application</TabsTrigger>
        <TabsTrigger value="audit">Audit</TabsTrigger>
        <TabsTrigger value="ai">AI Usage</TabsTrigger>
      </TabsList>

      <TabsContent value="cloudwatch" className="space-y-4">
        <LogFilters
          mode="cloudwatch"
          filters={cloudwatchFilters}
          onChange={setCloudwatchFilters}
          onApply={runCloudwatchQuery}
          isLoading={cloudwatchLoading}
        />
        {cloudwatchError && (
          <div className="text-sm text-red-600">{cloudwatchError}</div>
        )}
        <LogsTable
          columns={[
            { key: 'timestamp', label: 'Timestamp', className: 'whitespace-nowrap' },
            { key: 'level', label: 'Level' },
            { key: 'message', label: 'Message' },
          ]}
          rows={cloudwatchRows}
          loading={cloudwatchLoading}
        />
        {cloudwatchStats && (
          <div className="text-xs text-gray-500">
            Scanned: {cloudwatchStats.scannedEvents.toLocaleString()} events · Matched:{' '}
            {cloudwatchStats.matchedEvents.toLocaleString()} events · Status: {cloudwatchStatus}
          </div>
        )}
      </TabsContent>

      <TabsContent value="audit" className="space-y-4">
        <LogFilters
          mode="audit"
          filters={auditFilters}
          onChange={setAuditFilters}
          onApply={() => runAuditQuery(false)}
          isLoading={auditLoading}
        />
        {auditError && <div className="text-sm text-red-600">{auditError}</div>}
        <LogsTable
          columns={[
            { key: 'timestamp', label: 'Timestamp', className: 'whitespace-nowrap' },
            { key: 'action', label: 'Action' },
            { key: 'actorId', label: 'Actor' },
            { key: 'targetId', label: 'Target' },
            { key: 'metadata', label: 'Metadata' },
          ]}
          rows={auditRows}
          loading={auditLoading}
        />
        {auditPagination.hasMore && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => runAuditQuery(true)} disabled={auditLoading}>
              Load More
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="ai" className="space-y-4">
        <LogFilters
          mode="ai"
          filters={aiFilters}
          onChange={setAiFilters}
          onApply={() => runAiQuery(false)}
          isLoading={aiLoading}
        />
        {aiError && <div className="text-sm text-red-600">{aiError}</div>}
        <LogsTable
          columns={[
            { key: 'timestamp', label: 'Timestamp', className: 'whitespace-nowrap' },
            { key: 'userId', label: 'User' },
            { key: 'inputTokens', label: 'Input Tokens' },
            { key: 'outputTokens', label: 'Output Tokens' },
            { key: 'cost', label: 'Cost' },
          ]}
          rows={aiRows}
          loading={aiLoading}
        />
        {aiPagination.hasMore && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => runAiQuery(true)} disabled={aiLoading}>
              Load More
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function toIsoString(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatTimestamp(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function getLevelBadgeColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'warn':
      return 'bg-yellow-100 text-yellow-800';
    case 'debug':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}
