'use client';

import Link from 'next/link';
import { MapPin, Calendar, Pencil, Paperclip } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/utils/format';
import { getCategoryMeta } from '@/utils/categories';

interface Props {
  expense: Expense;
  members: { uid: string; displayName: string; photoURL: string | null }[];
  currency: string;
  tripId: string;
}

export default function ExpenseDetailModal({ expense, members, currency, tripId }: Props) {
  const payer = members.find((m) => m.uid === expense.paidByUid);
  const cat = getCategoryMeta(expense.category);
  const CatIcon = cat.icon;

  return (
    <div className="space-y-4">
      {/* Amount + Category */}
      <div className="text-center py-2">
        <p className="text-2xl font-bold text-[var(--color-text)]">
          {formatCurrency(expense.amount, currency)}
        </p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cat.color + '1A', color: cat.color }}
          >
            <CatIcon className="w-3 h-3" />
            {cat.label}
          </span>
          <Badge>{expense.splitType}</Badge>
        </div>
      </div>

      {/* Paid by */}
      <div className="flex items-center gap-3 p-3 bg-[var(--color-tab-bg)] rounded-xl">
        {payer && <Avatar name={payer.displayName} photoURL={payer.photoURL} size="sm" />}
        <div>
          <p className="text-xs text-[var(--color-text-secondary)]">Paid by</p>
          <p className="text-sm font-medium text-[var(--color-text)]">{payer?.displayName || 'Unknown'}</p>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Calendar className="w-4 h-4" />
        {formatDate(expense.date)}
      </div>

      {/* Location with minimap */}
      {expense.location && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4" />
            {expense.location.name}
          </div>
          {expense.location.lat !== 0 && expense.location.lng !== 0 && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
            <div className="rounded-xl overflow-hidden border border-[var(--color-border)]">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${expense.location.lat},${expense.location.lng}&zoom=16`}
                width="100%"
                height="150"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}

      {/* Split details */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">Split Details</p>
        {Object.entries(expense.splits).map(([uid, amount]) => {
          const member = members.find((m) => m.uid === uid);
          return (
            <div key={uid} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text)]">{member?.displayName || 'Unknown'}</span>
              <span className="font-medium text-[var(--color-text)]">{formatCurrency(amount, currency)}</span>
            </div>
          );
        })}
      </div>

      {/* Receipt */}
      {expense.receiptUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
            <Paperclip className="w-3.5 h-3.5" />
            Receipt
          </div>
          <a
            href={expense.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expense.receiptUrl}
              alt="Receipt"
              className="w-full max-h-64 object-contain bg-[var(--color-tab-bg)]"
            />
          </a>
        </div>
      )}

      {/* Edit button */}
      <Link href={`/trips/${tripId}/expenses/${expense.id}`}>
        <Button variant="outline" className="w-full">
          <Pencil className="w-4 h-4" />
          Edit Expense
        </Button>
      </Link>
    </div>
  );
}
