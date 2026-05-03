'use client';

import { useState } from 'react';
import { ArrowRight, Check, Smartphone, Plus, Wallet } from 'lucide-react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { Expense, Settlement, Advance } from '@/types';
import { calculateBalances, computePairwiseDebts, getUserTotalSpend, getTotalSpend } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
import { addSettlementLocal, addActivityLocal, addAdvanceLocal } from '@/lib/firestore';
import { toast } from 'sonner';

interface Props {
  expenses: Expense[];
  settlements: Settlement[];
  advances: Advance[];
  members: { uid: string; displayName: string; photoURL: string | null; upiId?: string }[];
  memberUids: string[];
  currency: string;
  tripId: string;
  currentUid: string;
  adminUid: string;
}

export default function BalancesTab({
  expenses,
  settlements,
  advances,
  members,
  memberUids,
  currency,
  tripId,
  currentUid,
  adminUid,
}: Props) {
  const [settlingDebt, setSettlingDebt] = useState<{ from: string; to: string; amount: number } | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);
  const [advanceMemberUid, setAdvanceMemberUid] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');
  const isAdmin = currentUid === adminUid;
  const adminMember = members.find((m) => m.uid === adminUid);
  const nonAdminMembers = members.filter((m) => m.uid !== adminUid);

  const balances = calculateBalances(expenses, settlements, memberUids, advances, adminUid);
  const debts = computePairwiseDebts(expenses, settlements, advances, adminUid);
  const totalSpend = getTotalSpend(expenses);
  const fairShare = memberUids.length > 0 ? totalSpend / memberUids.length : 0;

  const getMember = (uid: string) => members.find((m) => m.uid === uid);

  const openAdvanceModal = () => {
    setAdvanceMemberUid(nonAdminMembers[0]?.uid || '');
    setAdvanceAmount('');
    setAdvanceNote('');
    setShowAdvance(true);
  };

  const handleAddAdvance = () => {
    const numAmount = parseFloat(advanceAmount);
    if (!advanceMemberUid) {
      toast.error('Select a member');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    addAdvanceLocal(tripId, {
      memberUid: advanceMemberUid,
      amount: numAmount,
      note: advanceNote || undefined,
      addedByUid: currentUid,
    }).promise.catch((err) => {
      console.error('Advance save failed', err);
      toast.error('Failed to record advance');
    });
    const memberName = getMember(advanceMemberUid)?.displayName || 'Member';
    const adminName = adminMember?.displayName || 'Admin';
    const noteSuffix = advanceNote ? ` — ${advanceNote}` : '';
    addActivityLocal(tripId, {
      type: 'settled_up',
      actorUid: currentUid,
      description: `${adminName} recorded advance of ${formatCurrency(numAmount, currency)} from ${memberName}${noteSuffix}`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Advance recorded!');
    setShowAdvance(false);
  };

  const handleSettle = () => {
    if (!settlingDebt) return;
    const debt = settlingDebt;
    addSettlementLocal(tripId, {
      fromUid: debt.from,
      toUid: debt.to,
      amount: debt.amount,
    }).promise.catch((err) => {
      console.error('Settlement save failed', err);
      toast.error('Failed to settle');
    });
    const fromName = getMember(debt.from)?.displayName || 'Someone';
    const toName = getMember(debt.to)?.displayName || 'Someone';
    addActivityLocal(tripId, {
      type: 'settled_up',
      actorUid: currentUid,
      description: `${fromName} settled up with ${toName} — ${formatCurrency(debt.amount, currency)}`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Settled up!');
    setSettlingDebt(null);
  };

  return (
    <div className="space-y-6">
      {isAdmin && nonAdminMembers.length > 0 && (
        <div className="flex items-center justify-between gap-2 bg-[var(--color-primary-light)] rounded-xl p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Wallet className="w-4 h-4 text-[var(--color-primary)] shrink-0" />
            <p className="text-xs sm:text-sm text-[var(--color-text)] truncate">
              Record advance payments members gave you upfront
            </p>
          </div>
          <Button size="sm" onClick={openAdvanceModal} icon={<Plus className="w-3.5 h-3.5" />}>
            Add Advance
          </Button>
        </div>
      )}

      {debts.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(16, 185, 129, 0.12)' }}
          >
            <Check className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
          </div>
          <p className="text-[var(--color-text-secondary)] text-sm">All settled up! No outstanding balances.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Who owes whom</h3>
          <div className="space-y-2 stagger">
            {debts.map((debt, i) => {
              const from = getMember(debt.from);
              const to = getMember(debt.to);
              return (
                <Card key={i} padding="sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center -space-x-2 shrink-0">
                        {from && (
                          <Avatar
                            name={from.displayName}
                            photoURL={from.photoURL}
                            size="sm"
                            className="ring-2 ring-[var(--color-surface)]"
                          />
                        )}
                        <div className="relative z-10 w-6 h-6 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center ring-2 ring-[var(--color-surface)]">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                        {to && (
                          <Avatar
                            name={to.displayName}
                            photoURL={to.photoURL}
                            size="sm"
                            className="ring-2 ring-[var(--color-surface)]"
                          />
                        )}
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="text-[var(--color-text)] truncate">
                          <span className="font-medium">{from?.displayName}</span>
                          <span className="text-[var(--color-text-secondary)]"> owes </span>
                          <span className="font-medium">{to?.displayName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                      <span className="font-semibold text-[var(--color-primary)] tnum">
                        {formatCurrency(debt.amount, currency)}
                      </span>
                      {to?.upiId && (
                        <a
                          href={`upi://pay?pa=${encodeURIComponent(to.upiId)}&pn=${encodeURIComponent(to.displayName)}&am=${debt.amount.toFixed(2)}&cu=INR`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button size="sm" variant="outline" icon={<Smartphone className="w-3.5 h-3.5" />}>
                            Pay UPI
                          </Button>
                        </a>
                      )}
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
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Contribution breakdown</h3>
        <div className="space-y-2 stagger">
          {members.map((member) => {
            const spent = getUserTotalSpend(member.uid, expenses);
            const pct = totalSpend > 0 ? (spent / totalSpend) * 100 : 0;
            const bal = balances.get(member.uid) || 0;
            const positive = bal >= 0;
            return (
              <Card key={member.uid} padding="sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={member.displayName} photoURL={member.photoURL} size="sm" />
                    <span className="text-sm font-medium text-[var(--color-text)] truncate">{member.displayName}</span>
                  </div>
                  <span
                    className="text-sm font-medium shrink-0 tnum"
                    style={{ color: positive ? 'var(--color-success)' : 'var(--color-error)' }}
                  >
                    {positive ? 'gets back' : 'owes'} {formatCurrency(Math.abs(bal), currency)}
                  </span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bar-fill"
                    style={{ width: `${Math.min(pct, 100)}%`, background: 'var(--color-primary)' }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-[var(--color-text-secondary)] tnum">
                  <span>Paid: {formatCurrency(spent, currency)}</span>
                  <span>Fair share: {formatCurrency(fairShare, currency)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={showAdvance}
        onClose={() => setShowAdvance(false)}
        title="Add Advance Payment"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Record money a member gave you in advance. This will offset any future amount they owe you.
          </p>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text)]">From member</label>
            <select
              value={advanceMemberUid}
              onChange={(e) => setAdvanceMemberUid(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            >
              {nonAdminMembers.map((m) => (
                <option key={m.uid} value={m.uid}>{m.displayName}</option>
              ))}
            </select>
          </div>
          <Input
            label={`Amount (${currency})`}
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
          />
          <Input
            label="Note (optional)"
            placeholder="e.g., Hotel deposit"
            value={advanceNote}
            onChange={(e) => setAdvanceNote(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAdvance(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAddAdvance} className="flex-1">
              Record Advance
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!settlingDebt}
        onClose={() => setSettlingDebt(null)}
        title="Confirm Settlement"
      >
        {settlingDebt && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Confirm that <strong>{getMember(settlingDebt.from)?.displayName}</strong> has paid{' '}
              <strong>{formatCurrency(settlingDebt.amount, currency)}</strong> to{' '}
              <strong>{getMember(settlingDebt.to)?.displayName}</strong>.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSettlingDebt(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSettle} className="flex-1">
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
