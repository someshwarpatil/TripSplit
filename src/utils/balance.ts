import { Expense, Settlement, Advance, DebtSimplified } from '@/types';

export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  memberUids: string[],
  advances: Advance[] = [],
  adminUid?: string
): Map<string, number> {
  const balances = new Map<string, number>();
  memberUids.forEach((uid) => balances.set(uid, 0));

  for (const expense of expenses) {
    const payer = expense.paidByUid;
    balances.set(payer, (balances.get(payer) || 0) + expense.amount);

    for (const [uid, share] of Object.entries(expense.splits)) {
      balances.set(uid, (balances.get(uid) || 0) - share);
    }
  }

  for (const settlement of settlements) {
    balances.set(
      settlement.fromUid,
      (balances.get(settlement.fromUid) || 0) + settlement.amount
    );
    balances.set(
      settlement.toUid,
      (balances.get(settlement.toUid) || 0) - settlement.amount
    );
  }

  // Advances: member gave admin cash upfront. Admin owes member that amount
  // (until offset by member's share in admin-paid expenses, which already
  // appears as member-owes-admin pairwise). Net balance effect is identical
  // to a settlement from member to admin.
  if (adminUid) {
    for (const adv of advances) {
      balances.set(adv.memberUid, (balances.get(adv.memberUid) || 0) + adv.amount);
      balances.set(adminUid, (balances.get(adminUid) || 0) - adv.amount);
    }
  }

  return balances;
}

// Computes pairwise debts without cross-pair consolidation, so an advance
// between member<->admin never reduces a member's debt to someone else.
export function computePairwiseDebts(
  expenses: Expense[],
  settlements: Settlement[],
  advances: Advance[],
  adminUid: string | null
): DebtSimplified[] {
  const pairwise = new Map<string, number>();

  const addPair = (from: string, to: string, amount: number) => {
    if (!from || !to || from === to || amount === 0) return;
    const fwdKey = `${from}|${to}`;
    const bwdKey = `${to}|${from}`;
    const fwd = pairwise.get(fwdKey) || 0;
    const bwd = pairwise.get(bwdKey) || 0;
    const net = fwd - bwd + amount;
    pairwise.delete(fwdKey);
    pairwise.delete(bwdKey);
    if (net > 0.01) pairwise.set(fwdKey, net);
    else if (net < -0.01) pairwise.set(bwdKey, -net);
  };

  // Advances: admin holds member's cash → admin owes member
  if (adminUid) {
    for (const adv of advances) {
      addPair(adminUid, adv.memberUid, adv.amount);
    }
  }

  // Expenses: each non-payer's share is a debt to the payer
  for (const exp of expenses) {
    for (const [uid, share] of Object.entries(exp.splits)) {
      if (uid !== exp.paidByUid) {
        addPair(uid, exp.paidByUid, share);
      }
    }
  }

  // Settlements: "fromUid paid toUid" reduces fromUid→toUid debt
  for (const s of settlements) {
    addPair(s.toUid, s.fromUid, s.amount);
  }

  const debts: DebtSimplified[] = [];
  pairwise.forEach((amount, key) => {
    const [from, to] = key.split('|');
    debts.push({ from, to, amount: Math.round(amount * 100) / 100 });
  });
  debts.sort((a, b) => b.amount - a.amount);
  return debts;
}

export function simplifyDebts(balances: Map<string, number>): DebtSimplified[] {
  const creditors: { uid: string; amount: number }[] = [];
  const debtors: { uid: string; amount: number }[] = [];

  balances.forEach((balance, uid) => {
    if (balance > 0.01) {
      creditors.push({ uid, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ uid, amount: -balance });
    }
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const debts: DebtSimplified[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      debts.push({
        from: debtors[i].uid,
        to: creditors[j].uid,
        amount: Math.round(amount * 100) / 100,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return debts;
}

export function calculateEqualSplit(
  amount: number,
  memberUids: string[]
): Record<string, number> {
  const perPerson = Math.round((amount / memberUids.length) * 100) / 100;
  const splits: Record<string, number> = {};
  let remaining = amount;

  memberUids.forEach((uid, index) => {
    if (index === memberUids.length - 1) {
      splits[uid] = Math.round(remaining * 100) / 100;
    } else {
      splits[uid] = perPerson;
      remaining -= perPerson;
    }
  });

  return splits;
}

export function getUserBalance(
  uid: string,
  expenses: Expense[],
  settlements: Settlement[],
  memberUids: string[],
  advances: Advance[] = [],
  adminUid?: string
): number {
  const balances = calculateBalances(expenses, settlements, memberUids, advances, adminUid);
  return balances.get(uid) || 0;
}

export function getUserTotalSpend(uid: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.paidByUid === uid)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getTotalSpend(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
