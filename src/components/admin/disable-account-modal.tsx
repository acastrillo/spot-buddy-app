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
import { Textarea } from '@/components/ui/textarea';

interface DisableAccountModalUser {
  id: string;
  email: string;
  isDisabled?: boolean;
}

interface DisableAccountModalProps {
  open: boolean;
  user: DisableAccountModalUser | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function DisableAccountModal({ open, user, onOpenChange, onUpdated }: DisableAccountModalProps) {
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users/disable-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          disabled: !user.isDisabled,
          reason: !user.isDisabled ? reason.trim() : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update account status');
      }

      onOpenChange(false);
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  const isDisabling = !user.isDisabled;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isDisabling ? 'Disable Account' : 'Enable Account'}</DialogTitle>
          <DialogDescription>
            {isDisabling
              ? `Disable access for ${user.email}. The user will be blocked at the next session refresh.`
              : `Re-enable access for ${user.email}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isDisabling && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Reason for disabling this account"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant={isDisabling ? 'destructive' : 'default'}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : isDisabling ? 'Disable Account' : 'Enable Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
