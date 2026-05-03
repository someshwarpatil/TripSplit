'use client';

import { WifiOff, RefreshCw, Clock } from 'lucide-react';
import { useOffline } from '@/context/OfflineContext';
import { timeAgo } from '@/utils/format';

export default function OfflineBanner() {
  const { isOnline, hasPendingWrites, pendingUploads, lastSyncTime, isSyncing, syncNow } = useOffline();

  const hasPending = hasPendingWrites || pendingUploads > 0;

  // Hide when fully online with no pending writes
  if (isOnline && !hasPending) return null;

  return (
    <div className="sticky top-14 sm:top-16 z-30 animate-slide-down">
      <div className="max-w-5xl mx-auto px-4 py-2">
        <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20 rounded-xl px-4 py-3 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <WifiOff className="w-5 h-5 text-[var(--color-primary)]" />
              {!isOnline && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--color-error)] rounded-full animate-pulse-dot" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--color-text)]">
                {!isOnline ? "You're offline" : 'Pending changes'}
                {pendingUploads > 0 && (
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">
                    {pendingUploads} receipt{pendingUploads === 1 ? '' : 's'} queued
                  </span>
                )}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {!isOnline ? (
                  'Changes will sync automatically when reconnected'
                ) : lastSyncTime ? (
                  <>
                    <Clock className="w-3 h-3 inline mr-1 align-[-2px]" />
                    Last synced {timeAgo(lastSyncTime)}
                  </>
                ) : (
                  'Syncing pending changes...'
                )}
              </p>
            </div>
          </div>

          {hasPending && isOnline && (
            <button
              onClick={syncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
