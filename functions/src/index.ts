import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions/v2';

setGlobalOptions({ region: 'asia-south1' });

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

// ── Types (kept loose to avoid sharing client types into functions) ──

interface TripDoc {
  name: string;
  currency: string;
  memberUids: string[];
  adminUid: string;
}

interface ExpenseDoc {
  description: string;
  amount: number;
  paidByUid: string;
  splits: Record<string, number>;
}

interface SettlementDoc {
  fromUid: string;
  toUid: string;
  amount: number;
}

interface AdvanceDoc {
  memberUid: string;
  amount: number;
  addedByUid: string;
  note?: string;
}

// ── Helpers ──

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

async function getTrip(tripId: string): Promise<TripDoc | null> {
  const snap = await db.doc(`trips/${tripId}`).get();
  return snap.exists ? (snap.data() as TripDoc) : null;
}

async function getDisplayName(uid: string): Promise<string> {
  const snap = await db.doc(`users/${uid}`).get();
  return (snap.data()?.displayName as string) || 'A member';
}

async function tokensForUid(uid: string): Promise<string[]> {
  const snap = await db.collection(`users/${uid}/fcmTokens`).get();
  return snap.docs.map((d) => d.id);
}

async function tokensForUids(uids: string[]): Promise<{ uid: string; token: string }[]> {
  const all = await Promise.all(
    uids.map(async (uid) => (await tokensForUid(uid)).map((token) => ({ uid, token })))
  );
  return all.flat();
}

async function sendToUids(
  uids: string[],
  base: Omit<MulticastMessage, 'tokens'>
): Promise<void> {
  const cleanUids = uids.filter(Boolean);
  const targets = await tokensForUids(cleanUids);
  logger.info('sendToUids', {
    recipients: cleanUids,
    recipientCount: cleanUids.length,
    tokenCount: targets.length,
    title: base.notification?.title,
  });
  if (targets.length === 0) {
    logger.warn('No FCM tokens found for recipients — skipping send', { recipients: cleanUids });
    return;
  }
  const tokens = targets.map((t) => t.token);

  const res = await messaging.sendEachForMulticast({ ...base, tokens });
  logger.info('FCM send result', {
    success: res.successCount,
    failure: res.failureCount,
  });
  const stale: { uid: string; token: string }[] = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error?.code || '';
    if (
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/registration-token-not-registered'
    ) {
      stale.push(targets[i]);
    } else {
      logger.warn('FCM send error', { code, message: r.error?.message, uid: targets[i].uid });
    }
  });
  if (stale.length) {
    logger.info('Cleaning up stale tokens', { count: stale.length });
  }
  await Promise.all(
    stale.map(({ uid, token }) => db.doc(`users/${uid}/fcmTokens/${token}`).delete().catch(() => {}))
  );
}

// ── Triggers ──

export const onExpenseCreated = onDocumentCreated(
  'trips/{tripId}/expenses/{expenseId}',
  async (event) => {
    const expense = event.data?.data() as ExpenseDoc | undefined;
    const { tripId, expenseId } = event.params as { tripId: string; expenseId: string };
    logger.info('onExpenseCreated fired', { tripId, expenseId, hasData: !!expense });
    if (!expense) return;

    const trip = await getTrip(tripId);
    if (!trip) {
      logger.warn('Trip not found', { tripId });
      return;
    }

    const recipients = Object.keys(expense.splits || {}).filter(
      (uid) => uid !== expense.paidByUid
    );
    logger.info('Expense recipients', {
      paidByUid: expense.paidByUid,
      splitUids: Object.keys(expense.splits || {}),
      recipients,
    });
    if (recipients.length === 0) return;

    const payerName = await getDisplayName(expense.paidByUid);
    const amount = formatCurrency(expense.amount, trip.currency);

    await sendToUids(recipients, {
      notification: {
        title: `${trip.name} · New expense`,
        body: `${payerName} paid ${amount} for ${expense.description}`,
      },
      data: {
        url: `/trips/${tripId}`,
        tripId,
        kind: 'expense_added',
      },
      webpush: {
        fcmOptions: { link: `/trips/${tripId}` },
      },
    });
  }
);

export const onSettlementCreated = onDocumentCreated(
  'trips/{tripId}/settlements/{settlementId}',
  async (event) => {
    const settlement = event.data?.data() as SettlementDoc | undefined;
    if (!settlement) return;
    const { tripId } = event.params as { tripId: string };

    const trip = await getTrip(tripId);
    if (!trip) return;

    const fromName = await getDisplayName(settlement.fromUid);
    const amount = formatCurrency(settlement.amount, trip.currency);

    await sendToUids([settlement.toUid], {
      notification: {
        title: `${trip.name} · Settled up`,
        body: `${fromName} settled ${amount} with you`,
      },
      data: {
        url: `/trips/${tripId}`,
        tripId,
        kind: 'settled_up',
      },
      webpush: {
        fcmOptions: { link: `/trips/${tripId}` },
      },
    });
  }
);

export const onAdvanceCreated = onDocumentCreated(
  'trips/{tripId}/advances/{advanceId}',
  async (event) => {
    const advance = event.data?.data() as AdvanceDoc | undefined;
    if (!advance) return;
    const { tripId } = event.params as { tripId: string };

    const trip = await getTrip(tripId);
    if (!trip) return;

    const adminName = await getDisplayName(advance.addedByUid);
    const amount = formatCurrency(advance.amount, trip.currency);
    const noteSuffix = advance.note ? ` — ${advance.note}` : '';

    await sendToUids([advance.memberUid], {
      notification: {
        title: `${trip.name} · Advance recorded`,
        body: `${adminName} recorded an advance of ${amount} from you${noteSuffix}`,
      },
      data: {
        url: `/trips/${tripId}`,
        tripId,
        kind: 'advance_recorded',
      },
      webpush: {
        fcmOptions: { link: `/trips/${tripId}` },
      },
    });
  }
);
