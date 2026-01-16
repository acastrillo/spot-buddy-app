'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export function UserFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for debounced search
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams);

    // Treat "all" as clearing the filter
    if (value && value.trim() && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset pagination when filters change
    params.delete('lastEvaluatedKey');

    router.push(`/admin/users?${params.toString()}`);
  }, [router, searchParams]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter('search', searchValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchValue, updateFilter]);

  function clearAllFilters() {
    router.push('/admin/users');
    setSearchValue('');
  }

  const hasActiveFilters =
    searchParams.get('search') ||
    searchParams.get('tier') ||
    searchParams.get('status') ||
    searchParams.get('dateFrom') ||
    searchParams.get('dateTo') ||
    searchParams.get('isAdmin') ||
    searchParams.get('isBeta');

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search by email */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Email</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              type="search"
              placeholder="user@example.com"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Subscription Tier */}
        <div className="space-y-2">
          <Label htmlFor="tier">Subscription Tier</Label>
          <Select
            value={searchParams.get('tier') || 'all'}
            onValueChange={(value) => updateFilter('tier', value)}
          >
            <SelectTrigger id="tier">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="elite">Elite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subscription Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={searchParams.get('status') || 'all'}
            onValueChange={(value) => updateFilter('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Admin Filter */}
        <div className="space-y-2">
          <Label htmlFor="admin-filter">Filter Options</Label>
          <div className="flex items-center space-x-2 h-10">
            <Checkbox
              id="admin-filter"
              checked={searchParams.get('isAdmin') === 'true'}
              onCheckedChange={(checked) =>
                updateFilter('isAdmin', checked ? 'true' : '')
              }
            />
            <label
              htmlFor="admin-filter"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Admins Only
            </label>
          </div>
        </div>

        {/* Beta Filter */}
        <div className="space-y-2">
          <Label htmlFor="beta-filter">Beta Users</Label>
          <Select
            value={searchParams.get('isBeta') || 'all'}
            onValueChange={(value) => updateFilter('isBeta', value)}
          >
            <SelectTrigger id="beta-filter">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="true">Beta Only</SelectItem>
              <SelectItem value="false">Non-Beta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range - From */}
        <div className="space-y-2">
          <Label htmlFor="dateFrom">Signup Date From</Label>
          <Input
            id="dateFrom"
            type="date"
            value={searchParams.get('dateFrom') || ''}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
          />
        </div>

        {/* Date Range - To */}
        <div className="space-y-2">
          <Label htmlFor="dateTo">Signup Date To</Label>
          <Input
            id="dateTo"
            type="date"
            value={searchParams.get('dateTo') || ''}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
