'use client';

import { Expense, ExpenseCategory } from '@/types';
import { EXPENSE_CATEGORIES } from '@/utils/categories';
import { formatCurrency } from '@/utils/format';

interface Props {
  expenses: Expense[];
  currency: string;
}

export default function CategoryChart({ expenses, currency }: Props) {
  const totals = new Map<ExpenseCategory, number>();
  for (const exp of expenses) {
    const cat = exp.category ?? 'other';
    totals.set(cat, (totals.get(cat) ?? 0) + exp.amount);
  }
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
  if (grandTotal === 0) return null;

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = EXPENSE_CATEGORIES
    .filter((c) => (totals.get(c.id) ?? 0) > 0)
    .map((c) => {
      const amount = totals.get(c.id)!;
      const fraction = amount / grandTotal;
      const dashLength = fraction * circumference;
      const seg = { ...c, amount, fraction, dashLength, offset };
      offset += dashLength;
      return seg;
    });

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4 animate-fade-in">
      <p className="text-sm font-semibold text-[var(--color-text)] mb-3">Where the money went</p>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 160 160" className="w-28 h-28 sm:w-32 sm:h-32 shrink-0">
          {segments.map((seg) => (
            <circle
              key={seg.id}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="24"
              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
              strokeDashoffset={-seg.offset}
              transform="rotate(-90 80 80)"
            />
          ))}
          <text
            x="80"
            y="74"
            textAnchor="middle"
            fill="var(--color-text-secondary)"
            fontSize="10"
          >
            Total
          </text>
          <text
            x="80"
            y="92"
            textAnchor="middle"
            fill="var(--color-text)"
            fontSize="13"
            fontWeight="bold"
          >
            {formatCurrency(grandTotal, currency)}
          </text>
        </svg>
        <div className="grid gap-2.5 flex-1">
          {segments.map((seg) => {
            const Icon = seg.icon;
            return (
              <div key={seg.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: seg.color }} />
                <span className="text-[var(--color-text)] truncate text-xs sm:text-sm">{seg.label}</span>
                <span className="ml-auto text-[var(--color-text-secondary)] text-xs tabular-nums">
                  {(seg.fraction * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
