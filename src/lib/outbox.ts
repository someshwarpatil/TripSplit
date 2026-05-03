// IndexedDB outbox for receipt uploads. Storage SDK has no offline queue,
// so we persist failed/pending uploads here and retry on network restore.

import { uploadReceipt } from './storage';
import { updateExpense } from './firestore';

const DB_NAME = 'tripsplit-outbox';
const DB_VERSION = 1;
const STORE = 'uploads';
const MAX_ATTEMPTS = 8;

export interface UploadJob {
  id: string;
  tripId: string;
  expenseId: string;
  uid: string;
  blob: Blob;
  filename: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

async function putJob(job: UploadJob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = tx(db, 'readwrite').put(job);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}

async function deleteJob(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const r = tx(db, 'readwrite').delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
  });
  db.close();
}

async function listJobs(): Promise<UploadJob[]> {
  const db = await openDb();
  const out = await new Promise<UploadJob[]>((resolve, reject) => {
    const r = tx(db, 'readonly').getAll();
    r.onsuccess = () => resolve((r.result || []) as UploadJob[]);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return out;
}

function jobId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Try uploading; on failure, queue for retry. Either way, the function
// resolves quickly so callers can continue without blocking.
export async function scheduleReceiptUpload(args: {
  tripId: string;
  expenseId: string;
  uid: string;
  file: File | Blob;
  filename: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!navigator.onLine) {
    await persist(args);
    return;
  }
  try {
    const url = await uploadReceipt(args.tripId, args.expenseId, args.uid, args.file, args.filename);
    await updateExpense(args.tripId, args.expenseId, { receiptUrl: url });
  } catch {
    await persist(args);
  }
}

async function persist(args: {
  tripId: string;
  expenseId: string;
  uid: string;
  file: File | Blob;
  filename: string;
}): Promise<void> {
  await putJob({
    id: jobId(),
    tripId: args.tripId,
    expenseId: args.expenseId,
    uid: args.uid,
    blob: args.file instanceof Blob ? args.file : new Blob([args.file]),
    filename: args.filename,
    createdAt: Date.now(),
    attempts: 0,
  });
  notifyChanged();
}

function notifyChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('tripsplit-outbox-changed'));
  }
}

export async function getOutboxSize(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  try {
    const jobs = await listJobs();
    return jobs.length;
  } catch {
    return 0;
  }
}

let running = false;

export async function processOutbox(): Promise<{ processed: number; remaining: number }> {
  if (typeof window === 'undefined') return { processed: 0, remaining: 0 };
  if (running) return { processed: 0, remaining: await getOutboxSize() };
  if (!navigator.onLine) return { processed: 0, remaining: await getOutboxSize() };
  running = true;
  let processed = 0;
  try {
    const jobs = await listJobs();
    for (const job of jobs) {
      if (!navigator.onLine) break;
      try {
        const url = await uploadReceipt(job.tripId, job.expenseId, job.uid, job.blob, job.filename);
        await updateExpense(job.tripId, job.expenseId, { receiptUrl: url });
        await deleteJob(job.id);
        processed++;
      } catch (e) {
        const next: UploadJob = {
          ...job,
          attempts: job.attempts + 1,
          lastError: e instanceof Error ? e.message : String(e),
        };
        if (next.attempts >= MAX_ATTEMPTS) {
          await deleteJob(job.id);
        } else {
          await putJob(next);
        }
      }
    }
  } finally {
    running = false;
  }
  const remaining = await getOutboxSize();
  return { processed, remaining };
}
