import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db as getDb } from './firebase';
import { Trip, Expense, Activity, Settlement } from '@/types';

// ── Trips ──

export async function createTrip(data: {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  adminUid: string;
}): Promise<string> {
  const inviteCode = generateInviteCode();
  const docRef = await addDoc(collection(getDb(),'trips'), {
    ...data,
    inviteCode,
    memberUids: [data.adminUid],
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const snap = await getDoc(doc(getDb(),'trips', tripId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Trip;
}

export async function updateTrip(
  tripId: string,
  data: Partial<Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate'>>
) {
  await updateDoc(doc(getDb(),'trips', tripId), data);
}

export async function deleteTrip(tripId: string) {
  await deleteDoc(doc(getDb(),'trips', tripId));
}

export async function regenerateInviteCode(tripId: string): Promise<string> {
  const code = generateInviteCode();
  await updateDoc(doc(getDb(),'trips', tripId), { inviteCode: code });
  return code;
}

export async function getUserTrips(uid: string): Promise<Trip[]> {
  const q = query(
    collection(getDb(),'trips'),
    where('memberUids', 'array-contains', uid)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trip));
}

export async function getTripByInviteCode(code: string): Promise<Trip | null> {
  const q = query(
    collection(getDb(),'trips'),
    where('inviteCode', '==', code)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Trip;
}

export async function joinTrip(tripId: string, uid: string) {
  await updateDoc(doc(getDb(),'trips', tripId), {
    memberUids: arrayUnion(uid),
  });
}

export async function removeMember(tripId: string, uid: string) {
  await updateDoc(doc(getDb(),'trips', tripId), {
    memberUids: arrayRemove(uid),
  });
}

export function subscribeToTrip(
  tripId: string,
  callback: (trip: Trip | null) => void
): Unsubscribe {
  return onSnapshot(doc(getDb(),'trips', tripId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ id: snap.id, ...snap.data() } as Trip);
  });
}

// ── Expenses ──

export async function addExpense(
  tripId: string,
  data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(getDb(),'trips', tripId, 'expenses'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateExpense(
  tripId: string,
  expenseId: string,
  data: Partial<Omit<Expense, 'id' | 'createdAt'>>
) {
  await updateDoc(doc(getDb(),'trips', tripId, 'expenses', expenseId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteExpense(tripId: string, expenseId: string) {
  await deleteDoc(doc(getDb(),'trips', tripId, 'expenses', expenseId));
}

export async function getExpense(
  tripId: string,
  expenseId: string
): Promise<Expense | null> {
  const snap = await getDoc(doc(getDb(),'trips', tripId, 'expenses', expenseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Expense;
}

export function subscribeToExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(getDb(),'trips', tripId, 'expenses'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
  });
}

// ── Activities ──

export async function addActivity(
  tripId: string,
  data: Omit<Activity, 'id' | 'createdAt'>
) {
  await addDoc(collection(getDb(),'trips', tripId, 'activities'), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToActivities(
  tripId: string,
  callback: (activities: Activity[]) => void
): Unsubscribe {
  const q = query(
    collection(getDb(),'trips', tripId, 'activities'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity)));
  });
}

// ── Settlements ──

export async function addSettlement(
  tripId: string,
  data: Omit<Settlement, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(getDb(),'trips', tripId, 'settlements'), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeToSettlements(
  tripId: string,
  callback: (settlements: Settlement[]) => void
): Unsubscribe {
  const q = query(
    collection(getDb(),'trips', tripId, 'settlements'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Settlement)));
  });
}

// ── Users ──

export async function getUserDoc(uid: string) {
  const snap = await getDoc(doc(getDb(),'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
  };
}

export async function getUserDocs(uids: string[]) {
  const results = await Promise.all(uids.map((uid) => getUserDoc(uid)));
  return results.filter(Boolean) as {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
  }[];
}

// ── Helpers ──

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
