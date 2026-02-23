'use client';

import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';

interface Props {
  tripId: string;
  expenses: Expense[];
  members: { uid: string; displayName: string; photoURL: string | null }[];
  currency: string;
  loading: boolean;
}

export default function ExpensesTab({ tripId, expenses, members, currency, loading }: Props) {
  const router = useRouter();
  const getMember = (uid: string) => members.find((m) => m.uid === uid);

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
        <div className="w-12 h-12 bg-[#FFF0F1] rounded-xl flex items-center justify-center mx-auto mb-3">
          <Receipt className="w-6 h-6 text-[#E63946]" />
        </div>
        <p className="text-[#6B7280] text-sm">No expenses yet. Add your first expense!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const payer = getMember(expense.paidByUid);
        return (
          <Card
            key={expense.id}
            className="p-4"
            onClick={() => router.push(`/trips/${tripId}/expenses/${expense.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {payer && (
                  <Avatar name={payer.displayName} photoURL={payer.photoURL} size="sm" />
                )}
                <div>
                  <p className="font-medium text-[#1A1A2E]">{expense.description}</p>
                  <p className="text-xs text-[#6B7280]">
                    Paid by {payer?.displayName || 'Unknown'} &middot; {formatDate(expense.date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#1A1A2E]">
                  {formatCurrency(expense.amount, currency)}
                </p>
                <Badge>
                  {expense.splitType}
                </Badge>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
