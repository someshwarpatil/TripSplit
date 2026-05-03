'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase';
import { ScannedExpense } from '@/types';
import { toast } from 'sonner';

interface Props {
  currency: string;
  onResult: (results: ScanResult[]) => void;
}

export interface ScanResult {
  expense: ScannedExpense;
  file: File;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export default function ReceiptScanner({ currency, onResult }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.type.startsWith('image/')).slice(0, 10);
    if (next.length === 0) {
      toast.error('Please pick image files');
      return;
    }
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removeOne = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(files.filter((_, idx) => idx !== i));
    setPreviews(previews.filter((_, idx) => idx !== i));
  };

  const reset = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const analyze = async () => {
    if (!user || files.length === 0) return;
    setAnalyzing(true);
    try {
      const idToken = await auth().currentUser?.getIdToken();
      if (!idToken) {
        toast.error('Not signed in');
        return;
      }
      const images = await Promise.all(
        files.map(async (f) => ({ data: await fileToBase64(f), mimeType: f.type || 'image/jpeg' }))
      );
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ images, currency }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Analysis failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { expenses: ScannedExpense[] };
      const expenses = data.expenses || [];
      if (expenses.length === 0) {
        toast.error('No transactions found in the images');
        return;
      }
      const results: ScanResult[] = expenses.map((expense) => {
        const idx = Math.max(0, Math.min(files.length - 1, expense.sourceImageIndex || 0));
        return { expense, file: files[idx] };
      });
      toast.success(
        expenses.length === 1
          ? 'Found 1 transaction'
          : `Found ${expenses.length} transactions`
      );
      onResult(results);
      reset();
    } catch (e) {
      console.error(e);
      toast.error('Could not analyze images');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-tab-bg)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Camera className="w-4 h-4 text-[var(--color-text-secondary)]" />
        <h3 className="text-sm font-medium text-[var(--color-text)]">Scan a receipt or transactions</h3>
      </div>
      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
        Upload one or more photos. AI will extract amounts, merchants, and dates so you can review before saving.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {previews.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="press w-full py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-strong)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center justify-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Choose images
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeOne(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={analyzing}
              className="press flex-1 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={analyze}
              disabled={analyzing}
              className="press flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>Extract {files.length === 1 ? 'transaction' : 'transactions'}</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
