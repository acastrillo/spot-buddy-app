'use client';

import type { ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LogColumn {
  key: string;
  label: string;
  className?: string;
}

interface LogsTableProps {
  columns: LogColumn[];
  rows: Array<Record<string, ReactNode>>;
  loading?: boolean;
  emptyMessage?: string;
}

export function LogsTable({ columns, rows, loading, emptyMessage }: LogsTableProps) {
  if (!loading && rows.length === 0) {
    return (
      <div className="text-center p-6 text-sm text-gray-500">
        {emptyMessage || 'No logs found for this range.'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={idx}>
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {row[column.key] ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
