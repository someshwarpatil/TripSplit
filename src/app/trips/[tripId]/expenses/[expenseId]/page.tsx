'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTrip, useMembers } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { getExpense, updateExpense, deleteExpense, addActivity } from '@/lib/firestore';
import { calculateEqualSplit } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
import { Expense, SplitType } from '@/types';
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
  const [loading, setLoading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      }
    });
  }, [tripId, expenseId]);

  if (authLoading || !user || !trip || !expense) return null;

  const canEdit = expense.createdByUid === user.uid || trip.adminUid === user.uid;
  const isAdmin = trip.adminUid === user.uid;

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[#6B7280]">You don&apos;t have permission to edit this expense.</p>
          <Button variant="outline" onClick={() => router.back()} className="mt-4">Go Back</Button>
        </main>
      </div>
    );
  }

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

    setLoading(true);
    try {
      await updateExpense(tripId, expenseId, {
        description, amount: numAmount, paidByUid, date, splitType, splits,
      });
      await addActivity(tripId, {
        type: 'expense_updated',
        actorUid: user.uid,
        description: `${user.displayName} updated "${description}"`,
      });
      toast.success('Expense updated!');
      router.push(`/trips/${tripId}`);
    } catch {
      toast.error('Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExpense(tripId, expenseId);
      await addActivity(tripId, {
        type: 'expense_deleted',
        actorUid: user.uid,
        description: `${user.displayName} deleted "${expense.description}"`,
      });
      toast.success('Expense deleted');
      router.push(`/trips/${tripId}`);
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#6B7280] text-sm hover:text-[#1A1A2E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="p-2 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Edit Expense</h1>

        <form onSubmit={handleUpdate} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input label={`Amount (${trip.currency})`} type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#1A1A2E]">Paid By</label>
            <select
              value={paidByUid}
              onChange={(e) => setPaidByUid(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-all"
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

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1A1A2E]">Split Type</label>
            <div className="flex gap-2">
              {(['equal', 'custom', 'percentage'] as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    splitType === type ? 'bg-[#E63946] text-white' : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
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
                  <span className="text-sm text-[#1A1A2E] w-24 truncate">{m.displayName}</span>
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

          <Button type="submit" loading={loading} className="w-full">
            Update Expense
          </Button>
        </form>

        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Expense">
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              Are you sure you want to delete &quot;{expense.description}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Delete</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
