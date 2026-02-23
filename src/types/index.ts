export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: Date;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  adminUid: string;
  inviteCode: string;
  createdAt: Date;
  memberUids: string[];
}

export type SplitType = 'equal' | 'custom' | 'percentage';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidByUid: string;
  date: string;
  createdByUid: string;
  splitType: SplitType;
  splits: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityType =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'member_joined'
  | 'member_removed'
  | 'settled_up'
  | 'trip_created'
  | 'trip_updated';

export interface Activity {
  id: string;
  type: ActivityType;
  actorUid: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface Settlement {
  id: string;
  fromUid: string;
  toUid: string;
  amount: number;
  createdAt: Date;
}

export interface DebtSimplified {
  from: string;
  to: string;
  amount: number;
}
