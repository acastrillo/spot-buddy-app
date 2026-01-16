'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingCardProps {
  title: string;
  description?: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  children: React.ReactNode;
}

export function SettingCard({ title, description, updatedAt, updatedBy, children }: SettingCardProps) {
  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {(updatedAt || updatedBy) && (
        <CardFooter className="text-xs text-gray-500">
          {updatedAt && <span>Updated {formatTimestamp(updatedAt)}</span>}
          {updatedAt && updatedBy && <span className="mx-2">·</span>}
          {updatedBy && <span>By {updatedBy}</span>}
        </CardFooter>
      )}
    </Card>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
