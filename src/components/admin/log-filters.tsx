'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type LogFilterMode = 'cloudwatch' | 'audit' | 'ai';

export interface LogFiltersState {
  startTime: string;
  endTime: string;
  level?: string;
  search?: string;
  actorId?: string;
  action?: string;
  userId?: string;
}

interface LogFiltersProps {
  mode: LogFilterMode;
  filters: LogFiltersState;
  onChange: (next: LogFiltersState) => void;
  onApply: () => void;
  isLoading?: boolean;
}

export function LogFilters({ mode, filters, onChange, onApply, isLoading }: LogFiltersProps) {
  const update = (key: keyof LogFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${mode}-startTime`}>Start Time</Label>
          <Input
            id={`${mode}-startTime`}
            type="datetime-local"
            value={filters.startTime}
            onChange={(event) => update('startTime', event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${mode}-endTime`}>End Time</Label>
          <Input
            id={`${mode}-endTime`}
            type="datetime-local"
            value={filters.endTime}
            onChange={(event) => update('endTime', event.target.value)}
          />
        </div>

        {mode === 'cloudwatch' && (
          <div className="space-y-2">
            <Label htmlFor="log-level">Level</Label>
            <Select
              value={filters.level || ''}
              onValueChange={(value) => update('level', value)}
            >
              <SelectTrigger id="log-level">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'cloudwatch' && (
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="log-search">Search</Label>
            <Input
              id="log-search"
              placeholder="Search text"
              value={filters.search || ''}
              onChange={(event) => update('search', event.target.value)}
            />
          </div>
        )}

        {mode === 'audit' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="audit-actor">Actor ID</Label>
              <Input
                id="audit-actor"
                placeholder="User ID"
                value={filters.actorId || ''}
                onChange={(event) => update('actorId', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-action">Action</Label>
              <Input
                id="audit-action"
                placeholder="admin.change-tier"
                value={filters.action || ''}
                onChange={(event) => update('action', event.target.value)}
              />
            </div>
          </>
        )}

        {mode === 'ai' && (
          <div className="space-y-2">
            <Label htmlFor="ai-user">User ID</Label>
            <Input
              id="ai-user"
              placeholder="User ID"
              value={filters.userId || ''}
              onChange={(event) => update('userId', event.target.value)}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={onApply} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Run Query'}
        </Button>
      </div>
    </div>
  );
}
