'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2, MapPin, Navigation } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/utils/categories';
import { useAuth } from '@/context/AuthContext';
import { useTrip, useMembers } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { getExpense, updateExpense, deleteExpense, addActivityLocal } from '@/lib/firestore';
import { calculateEqualSplit } from '@/utils/balance';
import { Expense, SplitType, ExpenseCategory } from '@/types';
import { toast } from 'sonner';

export default function EditExpensePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const expenseId = params.expenseId as string;

  const { trip } = useTrip(tripId);
  const { members } = useMembers(trip?.memberUids || []);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidByUid, setPaidByUid] = useState('');
  const [date, setDate] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [showDelete, setShowDelete] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    getExpense(tripId, expenseId).then((e) => {
      if (e) {
        setExpense(e);
        setDescription(e.description);
        setAmount(e.amount.toString());
        setPaidByUid(e.paidByUid);
        setDate(e.date);
        setSplitType(e.splitType);
        const splits: Record<string, string> = {};
        Object.entries(e.splits).forEach(([uid, val]) => {
          splits[uid] = e.splitType === 'percentage'
            ? ((val / e.amount) * 100).toFixed(1)
            : val.toString();
        });
        setCustomSplits(splits);
        setCategory(e.category ?? 'other');
        if (e.location) {
          setLocationName(e.location.name);
          if (e.location.lat !== 0 || e.location.lng !== 0) {
            setLocationCoords({ lat: e.location.lat, lng: e.location.lng });
          }
        }
      }
    });
  }, [tripId, expenseId]);

  if (authLoading || !user || !trip || !expense) return null;

  const canEdit = expense.createdByUid === user.uid || trip.adminUid === user.uid;
  const isAdmin = trip.adminUid === user.uid;

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[var(--color-text-secondary)]">You don&apos;t have permission to edit this expense.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
        </main>
      </div>
    );
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!locationName) setLocationName('Current Location');
        setGettingLocation(false);
        toast.success('Location captured!');
      },
      () => { toast.error('Could not get location'); setGettingLocation(false); }
    );
  };

  const handleUpdate = async (e: React.FormEvent) => {
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
        if (isNaN(v) || v < 0) { toast.error('Enter valid amounts'); return; }
        splits[uid] = v;
        total += v;
      }
      if (Math.abs(total - numAmount) > 0.01) {
        toast.error('Split amounts must equal the total');
        return;
      }
    } else {
      splits = {};
      let totalPct = 0;
      for (const [uid, val] of Object.entries(customSplits)) {
        const v = parseFloat(val);
        if (isNaN(v) || v < 0) { toast.error('Enter valid percentages'); return; }
        totalPct += v;
        splits[uid] = Math.round((numAmount * v) / 100 * 100) / 100;
      }
      if (Math.abs(totalPct - 100) > 0.01) {
        toast.error('Percentages must total 100%');
        return;
      }
    }

    updateExpense(tripId, expenseId, {
      description, amount: numAmount, paidByUid, date, splitType, splits, category,
      ...(locationName ? {
        location: { name: locationName, lat: locationCoords?.lat ?? 0, lng: locationCoords?.lng ?? 0 }
      } : {}),
    }).catch((err) => {
      console.error('Expense update failed', err);
      toast.error('Failed to update expense');
    });
    addActivityLocal(tripId, {
      type: 'expense_updated',
      actorUid: user.uid,
      description: `${user.displayName} updated "${description}"`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Expense updated!');
    router.push(`/trips/${tripId}`);
  };

  const handleDelete = () => {
    const desc = expense.description;
    deleteExpense(tripId, expenseId).catch((err) => {
      console.error('Expense delete failed', err);
      toast.error('Failed to delete expense');
    });
    addActivityLocal(tripId, {
      type: 'expense_deleted',
      actorUid: user.uid,
      description: `${user.displayName} deleted "${desc}"`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Expense deleted');
    router.push(`/trips/${tripId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm hover:text-[var(--color-text)] transition-colors p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2.5 rounded-lg hover:bg-red-50 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-6">Edit Expense</h1>

        <form onSubmit={handleUpdate} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 sm:p-6 space-y-5">
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input label={`Amount (${trip.currency})`} type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />

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
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

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
                    splitType === type ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-tab-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {splitType !== 'equal' && (
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
            </div>
          )}

          <Button type="submit" className="w-full">
            Update Expense
          </Button>
        </form>

        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Expense">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Are you sure you want to delete &quot;{expense.description}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
