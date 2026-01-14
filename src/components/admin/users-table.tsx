'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Copy, Mail, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
  isAdmin: boolean;
  roles: string[];
  quotas: {
    ocr: { used: number; limit: number };
    ai: { used: number; limit: number };
    instagram: { used: number; limit: number };
  };
  costs: {
    currentMonth: number;
    total: number;
  };
  workoutsSaved: number;
  onboardingCompleted: boolean;
}

interface Pagination {
  total: number;
  limit: number;
  hasMore: boolean;
  lastEvaluatedKey?: string;
}

interface UsersTableProps {
  users: User[];
  pagination: Pagination | null;
  loading?: boolean;
}

export function UsersTable({ users, pagination, loading }: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyToClipboard(text: string, userId: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  function formatName(user: User) {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return name || '-';
  }

  function getTierBadgeVariant(tier: string) {
    switch (tier) {
      case 'elite':
        return 'default'; // Purple
      case 'pro':
        return 'secondary'; // Blue
      case 'core':
        return 'outline'; // Gray
      case 'free':
      default:
        return 'outline';
    }
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'trialing':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'canceled':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'inactive':
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  }

  function goToNextPage() {
    if (!pagination?.hasMore || !pagination?.lastEvaluatedKey) return;

    const params = new URLSearchParams(searchParams);
    params.set('lastEvaluatedKey', pagination.lastEvaluatedKey);
    router.push(`/admin/users?${params.toString()}`);
  }

  function goToPreviousPage() {
    // For DynamoDB, we can't easily go backwards
    // Use browser history instead
    router.back();
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead>Workouts</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-[200px]">{user.email}</span>
                      {user.isAdmin && (
                        <Badge variant="destructive" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatName(user)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={getTierBadgeVariant(user.subscriptionTier)}
                      className="capitalize"
                    >
                      {user.subscriptionTier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`capitalize ${getStatusBadgeColor(user.subscriptionStatus)}`}
                    >
                      {user.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-sm">{user.workoutsSaved}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => copyToClipboard(user.id, user.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copiedId === user.id ? 'Copied!' : 'Copy User ID'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copyToClipboard(user.email, `email-${user.id}`)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copiedId === `email-${user.id}` ? 'Copied!' : 'Copy Email'}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={`mailto:${user.email}`}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // This would open a details modal
                            alert(`User Details:\n\n${JSON.stringify(user, null, 2)}`);
                          }}
                        >
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Controls */}
      {pagination && users.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
            {pagination.hasMore && ' (more available)'}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousPage}
              disabled={!searchParams.get('lastEvaluatedKey') || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={!pagination.hasMore || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
