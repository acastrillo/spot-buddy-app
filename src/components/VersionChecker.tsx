'use client';

import { useEffect, useRef } from 'react';

const VERSION_CHECK_INTERVAL = 60000; // Check every 60 seconds

export function VersionChecker() {
  const initialBuildId = useRef<string | null>(null);
  const hasReloaded = useRef(false);

  useEffect(() => {
    // Don't run in development
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const checkVersion = async () => {
      try {
        const response = await fetch('/api/version', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const currentBuildId = data.buildId;

        if (!currentBuildId) {
          return;
        }

        // First check - store the initial build ID
        if (initialBuildId.current === null) {
          initialBuildId.current = currentBuildId;
          return;
        }

        // If build ID changed and we haven't already triggered a reload
        if (currentBuildId !== initialBuildId.current && !hasReloaded.current) {
          hasReloaded.current = true;
          console.log('[VersionChecker] New version detected, reloading...');

          // Clear any cached data before reload
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          }

          // Small delay to ensure any pending operations complete
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      } catch (error) {
        // Silently fail - network issues shouldn't break the app
        console.debug('[VersionChecker] Check failed:', error);
      }
    };

    // Initial check after a short delay (let the page settle)
    const initialTimeout = setTimeout(checkVersion, 5000);

    // Periodic checks
    const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

    // Also check when the page becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
}
