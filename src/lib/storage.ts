import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

function fileExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot) : '';
}

export async function uploadReceipt(
  tripId: string,
  expenseId: string,
  uid: string,
  file: File | Blob,
  filename?: string
): Promise<string> {
  const ext = filename ? fileExt(filename) : (file instanceof File ? fileExt(file.name) : '.jpg');
  const path = `trips/${tripId}/receipts/${expenseId}/${uid}-${Date.now()}${ext}`;
  const r = ref(storage(), path);
  await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
  return getDownloadURL(r);
}

export async function deleteReceipt(downloadUrl: string): Promise<void> {
  try {
    const url = new URL(downloadUrl);
    const path = decodeURIComponent(url.pathname.split('/o/')[1] || '');
    if (!path) return;
    await deleteObject(ref(storage(), path));
  } catch {
    // best-effort cleanup
  }
}
