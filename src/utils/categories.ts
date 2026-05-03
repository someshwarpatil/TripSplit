import {
  UtensilsCrossed,
  Car,
  Hotel,
  Ticket,
  ShoppingBag,
  MoreHorizontal,
} from 'lucide-react';
import { ExpenseCategory } from '@/types';

export const EXPENSE_CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  icon: typeof UtensilsCrossed;
  color: string;
}[] = [
  { id: 'food', label: 'Food', icon: UtensilsCrossed, color: '#E63946' },
  { id: 'transport', label: 'Transport', icon: Car, color: '#457B9D' },
  { id: 'accommodation', label: 'Stay', icon: Hotel, color: '#2A9D8F' },
  { id: 'activities', label: 'Activities', icon: Ticket, color: '#E9C46A' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#F4A261' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: '#9CA3AF' },
];

export function getCategoryMeta(id?: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((c) => c.id === id) ?? EXPENSE_CATEGORIES[5];
}
