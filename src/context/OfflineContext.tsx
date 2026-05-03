'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { waitForPendingWrites, onSnapshotsInSync } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { processOutbox, getOutboxSize } from '@/lib/outbox';
import { toast } from 'sonner';

interface OfflineContextType {
  isOnline: boolean;
  hasPendingWrites: boolean;
  pendingUploads: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  hasPendingWrites: false,
  pendingUploads: 0,
  lastSyncTime: null,
  isSyncing: false,
  syncNow: async () => {},
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const wasOfflineRef = useRef(false);

  const refreshOutboxCount = useCallback(async () => {
    setPendingUploads(await getOutboxSize());
  }, []);

  const drainOutbox = useCallback(async () => {
    if (!navigator.onLine) return;
    const { remaining } = await processOutbox();
    setPendingUploads(remaining);
  }, []);

  // Track network status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        toast.success('Back online');
        wasOfflineRef.current = false;
      }
      drainOutbox();
    };

    const goOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      toast('You are offline. Changes will sync when reconnected.', {
        icon: '📡',
        duration: 4000,
      });
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    refreshOutboxCount();
    drainOutbox();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [drainOutbox, refreshOutboxCount]);

  // Listen for outbox changes triggered by other code paths.
  useEffect(() => {
    const onChange = () => {
      refreshOutboxCount();
      drainOutbox();
    };
    window.addEventListener('tripsplit-outbox-changed', onChange);
    return () => window.removeEventListener('tripsplit-outbox-changed', onChange);
  }, [refreshOutboxCount, drainOutbox]);

  // Periodic sweep: process any uploads that were enqueued while offline.
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) drainOutbox();
    }, 15000);
    return () => clearInterval(interval);
  }, [drainOutbox]);

  // Monitor Firestore sync status
  useEffect(() => {
    let pending = false;

    const unsub = onSnapshotsInSync(db(), () => {
      // All snapshots are in sync - no pending writes
      if (pending) {
        pending = false;
        setHasPendingWrites(false);
        setLastSyncTime(new Date());
      }
    });

    // Periodically check for pending writes
    const interval = setInterval(async () => {
      try {
        const promise = waitForPendingWrites(db());
        // If it resolves immediately, no pending writes
        const race = await Promise.race([
          promise.then(() => 'resolved'),
          new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 200)),
        ]);
        if (race === 'timeout') {
          pending = true;
          setHasPendingWrites(true);
        } else {
          if (pending) {
            pending = false;
            setHasPendingWrites(false);
            setLastSyncTime(new Date());
          }
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Auto-retry sync every 5 seconds when offline
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        // Check if we're actually back online (navigator.onLine can lag behind events)
        if (navigator.onLine) {
          setIsOnline(true);
          if (wasOfflineRef.current) {
            toast.success('Back online');
            wasOfflineRef.current = false;
          }
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    toast.loading('Syncing...', { id: 'sync-toast' });
    try {
      await waitForPendingWrites(db());
      await drainOutbox();
      setHasPendingWrites(false);
      setLastSyncTime(new Date());
      toast.success('All changes synced', { id: 'sync-toast' });
    } catch {
      toast.error('Sync failed, will retry', { id: 'sync-toast' });
    } finally {
      setIsSyncing(false);
    }
  }, [drainOutbox]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        hasPendingWrites,
        pendingUploads,
        lastSyncTime,
        isSyncing,
        syncNow,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
