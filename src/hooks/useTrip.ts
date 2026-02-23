'use client';

import { useState, useEffect } from 'react';
import { Trip, Expense, Activity, Settlement } from '@/types';
import {
  subscribeToTrip,
  subscribeToExpenses,
  subscribeToActivities,
  subscribeToSettlements,
  getUserDocs,
} from '@/lib/firestore';

export function useTrip(tripId: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToTrip(tripId, (t) => {
      setTrip(t);
      setLoading(false);
    });
    return unsub;
  }, [tripId]);

  return { trip, loading };
}

export function useExpenses(tripId: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToExpenses(tripId, (e) => {
      setExpenses(e);
      setLoading(false);
    });
    return unsub;
  }, [tripId]);

  return { expenses, loading };
}

export function useActivities(tripId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToActivities(tripId, (a) => {
      setActivities(a);
      setLoading(false);
    });
    return unsub;
  }, [tripId]);

  return { activities, loading };
}

export function useSettlements(tripId: string) {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToSettlements(tripId, (s) => {
      setSettlements(s);
      setLoading(false);
    });
    return unsub;
  }, [tripId]);

  return { settlements, loading };
}

export function useMembers(memberUids: string[]) {
  const [members, setMembers] = useState<
    { uid: string; displayName: string; email: string; photoURL: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberUids.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }
    getUserDocs(memberUids).then((docs) => {
      setMembers(docs);
      setLoading(false);
    });
  }, [memberUids.join(',')]);

  return { members, loading };
}
