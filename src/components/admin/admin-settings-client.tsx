'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { SettingCard } from './setting-card';

interface SettingsResponse {
  success: boolean;
  data?: {
    globalBetaMode: boolean;
    updatedAt?: string | null;
    updatedBy?: string | null;
  };
  settings?: {
    globalBetaMode: boolean;
    updatedAt?: string | null;
    updatedBy?: string | null;
  };
  error?: string;
}

export function AdminSettingsClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalBetaMode, setGlobalBetaMode] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/settings');
      const data: SettingsResponse = await response.json();

      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Failed to load settings');
      }

      setGlobalBetaMode(Boolean(data.data.globalBetaMode));
      setUpdatedAt(data.data.updatedAt ?? null);
      setUpdatedBy(data.data.updatedBy ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    const nextValue = !globalBetaMode;
    const confirmMessage = nextValue
      ? 'Enable global beta restrictions? Beta users will be blocked from upgrading.'
      : 'Disable global beta restrictions? Beta users will be able to upgrade.';

    if (!window.confirm(confirmMessage)) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: 'globalBetaMode', value: nextValue }),
      });

      const data: SettingsResponse = await response.json();
      const payload = data.data || data.settings;
      if (!response.ok || !data.success || !payload) {
        throw new Error(data.error || 'Failed to update setting');
      }

      setGlobalBetaMode(Boolean(payload.globalBetaMode));
      setUpdatedAt(payload.updatedAt ?? null);
      setUpdatedBy(payload.updatedBy ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SettingCard
        title="Global Beta Mode"
        description="When enabled, beta users can view pricing but cannot upgrade or access billing portal."
        updatedAt={updatedAt}
        updatedBy={updatedBy}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            {isLoading
              ? 'Loading current state...'
              : globalBetaMode
                ? 'Beta restrictions are active.'
                : 'Beta restrictions are disabled.'}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="global-beta-mode"
              checked={globalBetaMode}
              onCheckedChange={handleToggle}
              disabled={isLoading || isSaving}
            />
            <label htmlFor="global-beta-mode" className="text-sm font-medium">
              {globalBetaMode ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </SettingCard>

      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchSettings} disabled={isLoading || isSaving}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
