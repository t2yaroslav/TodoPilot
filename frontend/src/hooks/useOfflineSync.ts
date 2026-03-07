import { useEffect } from 'react';
import { useOfflineStore } from '@/stores/offlineStore';
import { syncOfflineOps } from '@/lib/offlineSync';

/** Interval between health checks when the app thinks it's online */
const POLL_ONLINE_MS = 30_000;
/** Interval between health checks when the app thinks it's offline */
const POLL_OFFLINE_MS = 8_000;

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Monitors server connectivity and triggers offline queue sync on reconnect.
 * Should be mounted once at the app root level.
 */
export function useOfflineSync() {
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      const serverReachable = await checkServer();
      const { isOnline, setOnline } = useOfflineStore.getState();

      if (serverReachable !== isOnline) {
        setOnline(serverReachable);
      }

      if (serverReachable && !isOnline) {
        // Transitioned from offline → online: replay queued ops
        syncOfflineOps();
      }

      timeoutId = setTimeout(poll, serverReachable ? POLL_ONLINE_MS : POLL_OFFLINE_MS);
    }

    function handleBrowserOnline() {
      // Browser says network is back – run a check immediately
      poll();
    }

    function handleBrowserOffline() {
      // Browser says network is gone – mark offline immediately, don't wait
      useOfflineStore.getState().setOnline(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(poll, POLL_OFFLINE_MS);
    }

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    // Initial check
    poll();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);
}
