'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Navigation, Paperclip, Trash2, X } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/utils/categories';
import { useAuth } from '@/context/AuthContext';
import { useTrip, useMembers } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ReceiptScanner, { ScanResult } from '@/components/trip/ReceiptScanner';
import { addExpenseLocal, addActivityLocal } from '@/lib/firestore';
import { reverseGeocode } from '@/lib/geocode';
import { scheduleReceiptUpload } from '@/lib/outbox';
import { calculateEqualSplit } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
import { SplitType, ExpenseCategory } from '@/types';
import { toast } from 'sonner';

interface Draft {
  description: string;
  amount: string;
  date: string;
  category: ExpenseCategory;
  paidByUid: string;
  file: File;
  previewUrl: string;
}

export default function NewExpensePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;

  const { trip } = useTrip(tripId);
  const { members } = useMembers(trip?.memberUids || []);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByUid, setPaidByUid] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [locationName, setLocationName] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [pendingReceipt, setPendingReceipt] = useState<{ file: File; previewUrl: string } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !paidByUid) {
      setPaidByUid(user.uid);
    }
  }, [user, paidByUid]);

  useEffect(() => {
    if (members.length > 0) {
      const initial: Record<string, string> = {};
      members.forEach((m) => {
        initial[m.uid] = '';
      });
      setCustomSplits(initial);
    }
  }, [members]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      if (pendingReceipt) URL.revokeObjectURL(pendingReceipt.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading || !user || !trip) return null;

  const isAdmin = trip.adminUid === user.uid;

  const handleScanResult = (results: ScanResult[]) => {
    if (results.length === 0) return;
    if (results.length === 1) {
      const r = results[0];
      setDescription(r.expense.description || '');
      setAmount(r.expense.amount > 0 ? String(r.expense.amount) : '');
      if (r.expense.date) setDate(r.expense.date);
      if (r.expense.category) setCategory(r.expense.category);
      if (pendingReceipt) URL.revokeObjectURL(pendingReceipt.previewUrl);
      setPendingReceipt({ file: r.file, previewUrl: URL.createObjectURL(r.file) });
      setDrafts([]);
      return;
    }
    drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
    const today = new Date().toISOString().slice(0, 10);
    const next: Draft[] = results.map((r) => ({
      description: r.expense.description || '',
      amount: r.expense.amount > 0 ? String(r.expense.amount) : '',
      date: r.expense.date || today,
      category: r.expense.category || 'other',
      paidByUid: user.uid,
      file: r.file,
      previewUrl: URL.createObjectURL(r.file),
    }));
    setDrafts(next);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocationCoords({ lat, lng });
        const hadName = locationName.trim().length > 0;
        const placeName = await reverseGeocode(lat, lng);
        if (!hadName) setLocationName(placeName ?? 'Current Location');
        setGettingLocation(false);
        if (placeName || hadName) toast.success('Location captured!');
        else toast.success('Location captured (name unavailable)');
      },
      () => {
        toast.error('Could not get location');
        setGettingLocation(false);
      }
    );
  };

  const removeReceipt = () => {
    if (pendingReceipt) URL.revokeObjectURL(pendingReceipt.previewUrl);
    setPendingReceipt(null);
  };

  const updateDraft = (i: number, patch: Partial<Draft>) => {
    setDrafts((cur) => cur.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const removeDraft = (i: number) => {
    setDrafts((cur) => {
      URL.revokeObjectURL(cur[i].previewUrl);
      return cur.filter((_, idx) => idx !== i);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    let splits: Record<string, number>;

    if (splitType === 'equal') {
      splits = calculateEqualSplit(numAmount, trip.memberUids);
    } else if (splitType === 'custom') {
      splits = {};
      let total = 0;
      for (const [uid, val] of Object.entries(customSplits)) {
        const v = parseFloat(val);
        if (isNaN(v) || v < 0) {
          toast.error('Enter valid amounts for all members');
          return;
        }
        splits[uid] = v;
        total += v;
      }
      if (Math.abs(total - numAmount) > 0.01) {
        toast.error(`Split amounts must equal the total (${formatCurrency(numAmount, trip.currency)}). Current: ${formatCurrency(total, trip.currency)}`);
        return;
      }
    } else {
      splits = {};
      let totalPct = 0;
      for (const [uid, val] of Object.entries(customSplits)) {
        const v = parseFloat(val);
        if (isNaN(v) || v < 0) {
          toast.error('Enter valid percentages for all members');
          return;
        }
        totalPct += v;
        splits[uid] = Math.round((numAmount * v) / 100 * 100) / 100;
      }
      if (Math.abs(totalPct - 100) > 0.01) {
        toast.error('Percentages must total 100%');
        return;
      }
    }

    const { id: expenseId, promise: writePromise } = addExpenseLocal(tripId, {
      description,
      amount: numAmount,
      paidByUid,
      date,
      createdByUid: user.uid,
      splitType,
      splits,
      category,
      ...(locationName ? {
        location: {
          name: locationName,
          lat: locationCoords?.lat ?? 0,
          lng: locationCoords?.lng ?? 0,
        }
      } : {}),
    });
    writePromise.catch((err) => {
      console.error('Expense save failed', err);
      toast.error('Failed to save expense');
    });

    if (pendingReceipt) {
      const file = pendingReceipt.file;
      scheduleReceiptUpload({
        tripId,
        expenseId,
        uid: user.uid,
        file,
        filename: file.name,
      }).catch((err) => console.error('Receipt schedule failed', err));
    }

    const payerName = members.find((m) => m.uid === paidByUid)?.displayName || 'Someone';
    addActivityLocal(tripId, {
      type: 'expense_added',
      actorUid: user.uid,
      description: `${payerName} added "${description}" — ${formatCurrency(numAmount, trip.currency)}`,
    }).promise.catch((err) => console.error('Activity log failed', err));

    toast.success('Expense added!');
    router.push(`/trips/${tripId}`);
  };

  const handleSaveAllDrafts = () => {
    if (drafts.length === 0) return;
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i];
      const num = parseFloat(d.amount);
      if (!d.description.trim() || isNaN(num) || num <= 0) {
        toast.error(`Draft ${i + 1}: needs a description and valid amount`);
        return;
      }
    }
    for (const d of drafts) {
      const num = parseFloat(d.amount);
      const splits = calculateEqualSplit(num, trip.memberUids);
      const { id: expenseId, promise } = addExpenseLocal(tripId, {
        description: d.description,
        amount: num,
        paidByUid: d.paidByUid,
        date: d.date,
        createdByUid: user.uid,
        splitType: 'equal',
        splits,
        category: d.category,
      });
      promise.catch((err) => console.error('Expense save failed', err));

      scheduleReceiptUpload({
        tripId,
        expenseId,
        uid: user.uid,
        file: d.file,
        filename: d.file.name,
      }).catch((err) => console.error('Receipt schedule failed', err));

      const payerName = members.find((m) => m.uid === d.paidByUid)?.displayName || 'Someone';
      addActivityLocal(tripId, {
        type: 'expense_added',
        actorUid: user.uid,
        description: `${payerName} added "${d.description}" — ${formatCurrency(num, trip.currency)}`,
      }).promise.catch((err) => console.error('Activity log failed', err));
    }
    toast.success(`${drafts.length} expense${drafts.length === 1 ? '' : 's'} added!`);
    router.push(`/trips/${tripId}`);
  };

  const splitTotal = Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 sm:py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm mb-6 hover:text-[var(--color-text)] transition-colors p-1 -ml-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-4">
          {drafts.length > 0 ? `Review ${drafts.length} transactions` : 'Add Expense'}
        </h1>

        {drafts.length === 0 && (
          <div className="mb-4">
            <ReceiptScanner currency={trip.currency} onResult={handleScanResult} />
          </div>
        )}

        {drafts.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Edit anything before saving. All splits default to equal across {members.length} members.
            </p>
            {drafts.map((d, i) => (
              <div
                key={i}
                className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-4 space-y-3"
              >
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.previewUrl}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Input
                      label="Description"
                      value={d.description}
                      onChange={(e) => updateDraft(i, { description: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraft(i)}
                    className="self-start p-2 -mr-1 -mt-1 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                    aria-label="Remove draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={`Amount (${trip.currency})`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={d.amount}
                    onChange={(e) => updateDraft(i, { amount: e.target.value })}
                  />
                  <Input
                    label="Date"
                    type="date"
                    value={d.date}
                    onChange={(e) => updateDraft(i, { date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const active = d.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => updateDraft(i, { category: cat.id })}
                          className={`flex items-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-all ${
                            active
                              ? 'text-white shadow-sm'
                              : 'bg-[var(--color-tab-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                          }`}
                          style={active ? { backgroundColor: cat.color } : undefined}
                        >
                          <Icon className="w-3 h-3" />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">Paid by</label>
                  <select
                    value={d.paidByUid}
                    onChange={(e) => updateDraft(i, { paidByUid: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    {(isAdmin ? members : [members.find((m) => m.uid === user.uid)!, ...members.filter((m) => m.uid !== user.uid)]).map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.displayName}{m.uid === user.uid ? ' (you)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
                  setDrafts([]);
                }}
                className="flex-1"
              >
                Discard
              </Button>
              <Button
                type="button"
                onClick={handleSaveAllDrafts}
                className="flex-1"
              >
                Save {drafts.length}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 sm:p-6 space-y-5">
            {pendingReceipt && (
              <div className="flex items-center gap-3 p-2.5 bg-[var(--color-tab-bg)] rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingReceipt.previewUrl}
                  alt="Receipt"
                  className="w-12 h-12 rounded-lg object-cover border border-[var(--color-border)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text)] flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    Receipt attached
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">{pendingReceipt.file.name}</p>
                </div>
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]"
                  aria-label="Remove receipt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <Input
              label="Description"
              placeholder="e.g., Dinner at Luigi's"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <Input
              label={`Amount (${trip.currency})`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'text-white shadow-sm'
                          : 'bg-[var(--color-tab-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                      }`}
                      style={isActive ? { backgroundColor: cat.color } : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--color-text)]">Paid By</label>
              <select
                value={paidByUid}
                onChange={(e) => setPaidByUid(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              >
                {isAdmin ? (
                  members.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName}{m.uid === user.uid ? ' (you)' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={user.uid}>{user.displayName} (you)</option>
                    {members.filter(m => m.uid !== user.uid).map((m) => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-text)]">Location (optional)</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Cafe Milano"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="px-3 py-3 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] hover:bg-[var(--color-surface-hover)] transition-colors shrink-0"
                  title="Use current location"
                >
                  <Navigation className={`w-5 h-5 text-[var(--color-text-secondary)] ${gettingLocation ? 'animate-pulse' : ''}`} />
                </button>
              </div>
              {locationCoords && (
                <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {locationCoords.lat.toFixed(4)}, {locationCoords.lng.toFixed(4)}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--color-text)]">Split Type</label>
              <div className="flex gap-2">
                {(['equal', 'custom', 'percentage'] as SplitType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                      splitType === type
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-tab-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {splitType === 'equal' && amount && (
              <div className="bg-[var(--color-primary-light)] rounded-xl p-3">
                <p className="text-sm text-[var(--color-primary)]">
                  Each person pays {formatCurrency(parseFloat(amount) / members.length || 0, trip.currency)}
                </p>
              </div>
            )}

            {(splitType === 'custom' || splitType === 'percentage') && (
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m.uid} className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-text)] w-24 truncate">{m.displayName}</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={splitType === 'percentage' ? '%' : '0.00'}
                      value={customSplits[m.uid] || ''}
                      onChange={(e) => setCustomSplits({ ...customSplits, [m.uid]: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                ))}
                {amount && (
                  <div className={`text-sm ${
                    splitType === 'custom'
                      ? Math.abs(splitTotal - parseFloat(amount)) < 0.01 ? 'text-emerald-600' : 'text-[var(--color-error)]'
                      : Math.abs(splitTotal - 100) < 0.01 ? 'text-emerald-600' : 'text-[var(--color-error)]'
                  }`}>
                    {splitType === 'custom'
                      ? `Total: ${formatCurrency(splitTotal, trip.currency)} / ${formatCurrency(parseFloat(amount), trip.currency)}`
                      : `Total: ${splitTotal.toFixed(1)}% / 100%`
                    }
                  </div>
                )}
              </div>
            )}

            <Button type="submit" className="w-full">
              Add Expense
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}
