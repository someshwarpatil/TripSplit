'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTrip, useMembers } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { addExpense, addActivity } from '@/lib/firestore';
import { calculateEqualSplit } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
import { SplitType } from '@/types';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(false);

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

  if (authLoading || !user || !trip) return null;

  const isAdmin = trip.adminUid === user.uid;

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

    setLoading(true);
    try {
      await addExpense(tripId, {
        description,
        amount: numAmount,
        paidByUid,
        date,
        createdByUid: user.uid,
        splitType,
        splits,
      });
      const payerName = members.find((m) => m.uid === paidByUid)?.displayName || 'Someone';
      await addActivity(tripId, {
        type: 'expense_added',
        actorUid: user.uid,
        description: `${payerName} added "${description}" — ${formatCurrency(numAmount, trip.currency)}`,
      });
      toast.success('Expense added!');
      router.push(`/trips/${tripId}`);
    } catch {
      toast.error('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const splitTotal = Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[#6B7280] text-sm mb-6 hover:text-[#1A1A2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Add Expense</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
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
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <div className="space-y-3">
            <label className="block text-sm font-medium text-[#1A1A2E]">Split Type</label>
            <div className="flex gap-2">
              {(['equal', 'custom', 'percentage'] as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    splitType === type
                      ? 'bg-[#E63946] text-white'
                      : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {splitType === 'equal' && amount && (
            <div className="bg-[#FFF0F1] rounded-xl p-3">
              <p className="text-sm text-[#E63946]">
                Each person pays {formatCurrency(parseFloat(amount) / members.length || 0, trip.currency)}
              </p>
            </div>
          )}

          {(splitType === 'custom' || splitType === 'percentage') && (
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
              {amount && (
                <div className={`text-sm ${
                  splitType === 'custom'
                    ? Math.abs(splitTotal - parseFloat(amount)) < 0.01 ? 'text-emerald-600' : 'text-[#EF4444]'
                    : Math.abs(splitTotal - 100) < 0.01 ? 'text-emerald-600' : 'text-[#EF4444]'
                }`}>
                  {splitType === 'custom'
                    ? `Total: ${formatCurrency(splitTotal, trip.currency)} / ${formatCurrency(parseFloat(amount), trip.currency)}`
                    : `Total: ${splitTotal.toFixed(1)}% / 100%`
                  }
                </div>
              )}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Add Expense
          </Button>
        </form>
      </main>
    </div>
  );
}
