'use client';

import { useState } from 'react';
import { Receipt, MapPin, Search } from 'lucide-react';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import ExpenseDetailModal from '@/components/trip/ExpenseDetailModal';
import { Expense, ExpenseCategory } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { EXPENSE_CATEGORIES, getCategoryMeta } from '@/utils/categories';

interface Props {
  tripId: string;
  expenses: Expense[];
  members: { uid: string; displayName: string; photoURL: string | null }[];
  currency: string;
  loading: boolean;
}

export default function ExpensesTab({ tripId, expenses, members, currency, loading }: Props) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');
  const [selectedPayer, setSelectedPayer] = useState<string | 'all'>('all');
  const getMember = (uid: string) => members.find((m) => m.uid === uid);

  const filteredExpenses = expenses.filter((exp) => {
    if (searchQuery && !exp.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory !== 'all' && (exp.category ?? 'other') !== selectedCategory) return false;
    if (selectedPayer !== 'all' && exp.paidByUid !== selectedPayer) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-[var(--color-primary-light)] rounded-xl flex items-center justify-center mx-auto mb-3">
          <Receipt className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
        <p className="text-[var(--color-text-secondary)] text-sm">No expenses yet. Add your first expense!</p>
      </div>
    );
  }

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
        <input
          type="text"
          placeholder="Search expenses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all placeholder:text-[var(--color-text-secondary)]"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            selectedCategory === 'all'
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-tab-bg)] text-[var(--color-text-secondary)]'
          }`}
        >
          All
        </button>
        {EXPENSE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isActive ? 'all' : cat.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive ? 'text-white' : 'bg-[var(--color-tab-bg)] text-[var(--color-text-secondary)]'
              }`}
              style={isActive ? { backgroundColor: cat.color } : undefined}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Payer filter */}
      {members.length > 2 && (
        <select
          value={selectedPayer}
          onChange={(e) => setSelectedPayer(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] text-[var(--color-text)] text-sm mb-3"
        >
          <option value="all">All members</option>
          {members.map((m) => (
            <option key={m.uid} value={m.uid}>{m.displayName}</option>
          ))}
        </select>
      )}

      {/* Expense list */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--color-text-secondary)] text-sm">No matching expenses</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(
            filteredExpenses.reduce<Record<string, Expense[]>>((acc, exp) => {
              const key = formatDate(exp.date);
              (acc[key] = acc[key] || []).push(exp);
              return acc;
            }, {})
          ).map(([dateLabel, group]) => (
            <div key={dateLabel}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)] mb-2 px-1">
                {dateLabel}
              </p>
              <div className="space-y-2 stagger">
                {group.map((expense) => {
                  const payer = getMember(expense.paidByUid);
                  const cat = getCategoryMeta(expense.category);
                  const CatIcon = cat.icon;
                  return (
                    <Card
                      key={expense.id}
                      padding="sm"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                            style={{ backgroundColor: cat.color + '1F', color: cat.color }}
                          >
                            <CatIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--color-text)] truncate">{expense.description}</p>
                            <p className="text-xs text-[var(--color-text-secondary)] truncate">
                              Paid by {payer?.displayName || 'Unknown'}
                            </p>
                            {expense.location && (
                              <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{expense.location.name}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-[var(--color-text)] tnum">
                            {formatCurrency(expense.amount, currency)}
                          </p>
                          <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                            {cat.label}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title={selectedExpense?.description || 'Expense Detail'}
      >
        {selectedExpense && (
          <ExpenseDetailModal
            expense={selectedExpense}
            members={members}
            currency={currency}
            tripId={tripId}
          />
        )}
      </Modal>
    </>
  );
}
