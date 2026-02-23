'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Expense, Settlement } from '@/types';
import { calculateBalances, simplifyDebts, getUserTotalSpend, getTotalSpend } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
import { addSettlement, addActivity } from '@/lib/firestore';
import { toast } from 'sonner';

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  members: { uid: string; displayName: string; photoURL: string | null }[];
  memberUids: string[];
  currency: string;
  tripId: string;
  currentUid: string;
}

export default function BalancesTab({
  expenses,
  settlements,
  members,
  memberUids,
  currency,
  tripId,
  currentUid,
}: Props) {
  const [settlingDebt, setSettlingDebt] = useState<{ from: string; to: string; amount: number } | null>(null);
  const [settling, setSettling] = useState(false);

  const balances = calculateBalances(expenses, settlements, memberUids);
  const debts = simplifyDebts(balances);
  const totalSpend = getTotalSpend(expenses);
  const fairShare = memberUids.length > 0 ? totalSpend / memberUids.length : 0;

  const getMember = (uid: string) => members.find((m) => m.uid === uid);

  const handleSettle = async () => {
    if (!settlingDebt) return;
    setSettling(true);
    try {
      await addSettlement(tripId, {
        fromUid: settlingDebt.from,
        toUid: settlingDebt.to,
        amount: settlingDebt.amount,
      });
      const fromName = getMember(settlingDebt.from)?.displayName || 'Someone';
      const toName = getMember(settlingDebt.to)?.displayName || 'Someone';
      await addActivity(tripId, {
        type: 'settled_up',
        actorUid: currentUid,
        description: `${fromName} settled up with ${toName} — ${formatCurrency(settlingDebt.amount, currency)}`,
      });
      toast.success('Settled up!');
      setSettlingDebt(null);
    } catch {
      toast.error('Failed to settle');
    } finally {
      setSettling(false);
    }
  };

  return (
    <div className="space-y-6">
      {debts.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-[#6B7280] text-sm">All settled up! No outstanding balances.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-[#6B7280]">Simplified Settlements</h3>
          {debts.map((debt, i) => {
            const from = getMember(debt.from);
            const to = getMember(debt.to);
            return (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {from && <Avatar name={from.displayName} photoURL={from.photoURL} size="sm" />}
                    <span className="text-sm font-medium text-[#1A1A2E]">{from?.displayName}</span>
                    <ArrowRight className="w-4 h-4 text-[#6B7280]" />
                    {to && <Avatar name={to.displayName} photoURL={to.photoURL} size="sm" />}
                    <span className="text-sm font-medium text-[#1A1A2E]">{to?.displayName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#E63946]">
                      {formatCurrency(debt.amount, currency)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSettlingDebt(debt)}
                    >
                      Settle
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-[#6B7280]">Contribution Breakdown</h3>
        {members.map((member) => {
          const spent = getUserTotalSpend(member.uid, expenses);
          const pct = totalSpend > 0 ? (spent / totalSpend) * 100 : 0;
          const bal = balances.get(member.uid) || 0;
          return (
            <Card key={member.uid} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar name={member.displayName} photoURL={member.photoURL} size="sm" />
                  <span className="text-sm font-medium text-[#1A1A2E]">{member.displayName}</span>
                </div>
                <span className={`text-sm font-medium ${bal >= 0 ? 'text-emerald-600' : 'text-[#EF4444]'}`}>
                  {bal >= 0 ? 'gets back' : 'owes'} {formatCurrency(Math.abs(bal), currency)}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-[#E63946] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-[#6B7280]">
                <span>Paid: {formatCurrency(spent, currency)}</span>
                <span>Fair share: {formatCurrency(fairShare, currency)}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={!!settlingDebt}
        onClose={() => setSettlingDebt(null)}
        title="Confirm Settlement"
      >
        {settlingDebt && (
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              Confirm that <strong>{getMember(settlingDebt.from)?.displayName}</strong> has paid{' '}
              <strong>{formatCurrency(settlingDebt.amount, currency)}</strong> to{' '}
              <strong>{getMember(settlingDebt.to)?.displayName}</strong>.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSettlingDebt(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSettle} loading={settling} className="flex-1">
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
