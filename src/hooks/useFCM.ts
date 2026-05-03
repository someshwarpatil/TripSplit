'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchFcmToken,
  isMessagingSupported,
  onForegroundMessage,
  requestNotificationPermission,
} from '@/lib/fcm';
import { deleteFcmToken, saveFcmToken } from '@/lib/firestore';
import { toast } from 'sonner';

type Status = 'unknown' | 'unsupported' | 'default' | 'granted' | 'denied';

export function useFCM() {
  const { user } = useAuth();
  const [status, setStatus] = useState<Status>('unknown');
  const [working, setWorking] = useState(false);
  const supportedRef = useRef<boolean | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  const syncStatus = useCallback(async () => {
    if (supportedRef.current === null) {
      supportedRef.current = await isMessagingSupported();
    }
    if (!supportedRef.current) {
      setStatus('unsupported');
      return;
    }
    setStatus(Notification.permission as Status);
  }, []);

  useEffect(() => {
    syncStatus();
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [syncStatus]);

  // Foreground messages → toast
  useEffect(() => {
    if (status !== 'granted') return;
    let unsub: (() => void) | undefined;
    onForegroundMessage((payload) => {
      const title = payload.notification?.title || 'TripSplit';
      const body = payload.notification?.body || '';
      toast(title, { description: body });
    }).then((u) => {
      unsub = u;
    });
    return () => {
      unsub?.();
    };
  }, [status]);

  // Verify the granted status by actually resolving a token. If getToken
  // fails (permission reset, SW unregistered, push service revoked), fall
  // back to 'default' so the UI reflects reality instead of cached state.
  useEffect(() => {
    if (!user || status !== 'granted') return;
    let cancelled = false;
    fetchFcmToken().then((token) => {
      if (cancelled) return;
      if (token) {
        lastTokenRef.current = token;
        saveFcmToken(user.uid, token).catch(() => {});
      } else {
        setStatus('default');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  // If permission moves away from 'granted', drop the token this device saved.
  useEffect(() => {
    if (!user) return;
    if (status === 'granted') return;
    const token = lastTokenRef.current;
    if (!token) return;
    lastTokenRef.current = null;
    deleteFcmToken(user.uid, token).catch(() => {});
  }, [user, status]);

  const enable = useCallback(async () => {
    if (!user) return;
    setWorking(true);
    try {
      const perm = await requestNotificationPermission();
      setStatus(perm as Status);
      if (perm !== 'granted') {
        toast.error('Notifications blocked');
        return;
      }
      const token = await fetchFcmToken();
      if (!token) {
        toast.error('Could not enable notifications');
        return;
      }
      lastTokenRef.current = token;
      await saveFcmToken(user.uid, token);
      toast.success('Notifications enabled');
    } catch {
      toast.error('Could not enable notifications');
    } finally {
      setWorking(false);
    }
  }, [user]);

  return { status, working, enable };
}
