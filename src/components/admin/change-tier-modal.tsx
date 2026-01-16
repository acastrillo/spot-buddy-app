'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChangeTierModalUser {
  id: string;
  email: string;
  subscriptionTier: string;
  hasStripeSubscription?: boolean;
}

interface ChangeTierModalProps {
  open: boolean;
  user: ChangeTierModalUser | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function ChangeTierModal({ open, user, onOpenChange, onUpdated }: ChangeTierModalProps) {
  const [selectedTier, setSelectedTier] = useState('free');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setSelectedTier(user.subscriptionTier || 'free');
      setError(null);
    }
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users/change-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, newTier: selectedTier }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update subscription tier');
      }

      if (data?.warnings?.length) {
        console.warn('[Admin] Tier change warnings:', data.warnings);
      }

      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription tier');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Change Subscription Tier</DialogTitle>
          <DialogDescription>
            Update the subscription tier for {user.email}. Stripe will not be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {user.hasStripeSubscription && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Warning: This user has an active Stripe subscription. Stripe webhooks may overwrite this change.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">New Tier</label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="core">Core</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="elite">Elite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Confirm Change'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
