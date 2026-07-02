/**
 * Payments client — live payment list per job + calls to the backend, which
 * holds the Morning (Green Invoice) credentials and issues the documents.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { collection, onSnapshot } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { Payment, PaymentMethod, DocKind } from '../types/payment';

const functions = getFunctions(getApp(), 'me-west1');

/** Realtime payments of a job, newest first. */
export function subscribeToPayments(
  callId: string,
  onChange: (payments: Payment[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, 'serviceCalls', callId, 'payments'),
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

/** Record a received payment (validated server-side against the open balance). */
export async function addJobPayment(input: {
  callId: string;
  amount: number;
  method: PaymentMethod;
  date?: string;
  note?: string;
  issueNow?: boolean;
  docKind?: DocKind;
}): Promise<void> {
  await httpsCallable(functions, 'addJobPayment')(input);
}

/** Issue (or retry) the Morning document for a payment. */
export async function issuePaymentDocument(callId: string, paymentId: string): Promise<void> {
  await httpsCallable(functions, 'issuePaymentDocument')({ callId, paymentId });
}
