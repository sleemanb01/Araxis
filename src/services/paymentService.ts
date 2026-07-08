/**
 * Payments client — live payment list per job + recording payments.
 *
 * MORNING_ENABLED=false (current): payments are recorded locally in Firestore —
 * no accounting document — so the whole flow (partial payments, balance,
 * status, paid sync) is testable without the Morning API.
 * MORNING_ENABLED=true: everything goes through the backend callables, which
 * hold the Morning (Green Invoice) credentials and issue the documents.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { collection, collectionGroup, doc, getDoc, getDocs, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { assertWritable } from './demoMode';
import { Payment, PaymentMethod, DocKind } from '../types/payment';

/** Flip to true once the Morning secrets are set and the callables deployed. */
export const MORNING_ENABLED = false;

const functions = getFunctions(getApp(), 'me-west1');
const CALLS = 'serviceCalls';

/** Realtime payments of a job, newest first. */
export function subscribeToPayments(
  callId: string,
  onChange: (payments: Payment[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, CALLS, callId, 'payments'),
    (snap) => {
      const list = snap.docs.map((d) => {
        const p = d.data() as any;
        return {
          id: d.id,
          amount: p.amount ?? 0,
          method: (p.method ?? 'other') as PaymentMethod,
          date: p.date ?? '',
          note: p.note || undefined,
          docKind: (p.docKind ?? 'receipt') as DocKind,
          status: p.status ?? 'pending',
          morningDocumentId: p.morningDocumentId || undefined,
          morningDocumentNumber: p.morningDocumentNumber || undefined,
          morningPdfUrl: p.morningPdfUrl || undefined,
          error: p.error || undefined,
          createdAt: p.createdAt ?? '',
        } as Payment;
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(list);
    },
    (err) => {
      console.warn('[payments] listener error:', err);
      onError?.(err as Error);
    }
  );
}

/**
 * ALL payment records in ONE collection-group query (daily collected totals).
 * Returns [] until the collection-group rule is deployed.
 */
export async function getAllPayments(): Promise<Payment[]> {
  try {
    const snap = await getDocs(collectionGroup(db, 'payments'));
    return snap.docs.map((d) => {
      const p = d.data() as any;
      return {
        id: d.id,
        callId: d.ref.parent.parent?.id,
        amount: p.amount ?? 0,
        method: (p.method ?? 'other') as PaymentMethod,
        date: p.date ?? '',
        docKind: (p.docKind ?? 'receipt') as DocKind,
        status: p.status ?? 'pending',
        createdAt: p.createdAt ?? '',
      } as Payment;
    });
  } catch {
    return [];
  }
}

/** Record a received payment, validated against the deal's open balance. */
export async function addJobPayment(input: {
  callId: string;
  amount: number;
  method: PaymentMethod;
  date?: string;
  note?: string;
  issueNow?: boolean;
  docKind?: DocKind;
}): Promise<void> {
  assertWritable();
  if (MORNING_ENABLED) {
    await httpsCallable(functions, 'addJobPayment')(input);
    return;
  }

  // Local mode — record the payment and keep financials.paidAmount in sync.
  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (amount <= 0) throw new Error('יש להזין סכום חיובי.');
  const finRef = doc(db, CALLS, input.callId, 'privateData', 'financials');
  const [finSnap, paysSnap] = await Promise.all([
    getDoc(finRef),
    getDocs(collection(db, CALLS, input.callId, 'payments')),
  ]);
  let issued = 0;
  let reserved = 0;
  paysSnap.docs.forEach((d) => {
    const p = d.data() as any;
    const amt = typeof p.amount === 'number' ? p.amount : 0;
    if (p.status === 'issued') issued += amt;
    if (p.status !== 'failed') reserved += amt;
  });
  // Legacy jobs may carry a manually-entered paid amount with no payment
  // records behind it — treat it as already-collected money, not as room.
  const storedPaid = (finSnap.data() as any)?.paidAmount ?? 0;
  const baseIssued = Math.max(issued, storedPaid);
  const baseReserved = Math.max(reserved, storedPaid);
  const total = (finSnap.data() as any)?.overallPrice ?? 0;
  if (total > 0 && baseReserved + amount > total + 0.005) {
    throw new Error(
      `הסכום גדול מהיתרה הפתוחה (נותרו ₪${Math.max(0, Math.round(total - baseReserved)).toLocaleString('he-IL')}).`
    );
  }

  await setDoc(doc(collection(db, CALLS, input.callId, 'payments')), {
    amount,
    method: input.method,
    date: input.date || new Date().toISOString().slice(0, 10),
    note: input.note || '',
    docKind: input.docKind ?? 'receipt',
    status: 'issued', // counts as received; no document in local mode
    createdAt: new Date().toISOString(),
  });
  await setDoc(finRef, { paidAmount: baseIssued + amount }, { merge: true });
}

/** Issue (or retry) the Morning document for a payment (Morning mode only). */
export async function issuePaymentDocument(callId: string, paymentId: string): Promise<void> {
  assertWritable();
  if (!MORNING_ENABLED) throw new Error('חיבור Morning עדיין לא הופעל.');
  await httpsCallable(functions, 'issuePaymentDocument')({ callId, paymentId });
}
