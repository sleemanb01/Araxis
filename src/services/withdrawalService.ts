/**
 * Withdrawal log — warehouse→crew withdrawals (collection: "withdrawals").
 * Entries are written by inventoryService.withdrawToCrew (batched with the stock
 * move). Read per crew for its history. Modular RN Firebase API.
 */

import { collection, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { Withdrawal } from '../types/withdrawal';

const WITHDRAWALS = 'withdrawals';

function toWithdrawal(snap: { id: string; data: () => any }): Withdrawal {
  const d = snap.data();
  return {
    id: snap.id,
    crewId: d.crewId ?? '',
    itemId: d.itemId ?? '',
    itemName: d.itemName ?? undefined,
    withdrawerId: d.withdrawerId ?? '',
    amount: d.amount ?? 0,
    type: d.type === 'return' ? 'return' : 'withdraw',
    createdAt: d.createdAt ?? '',
  };
}

/** Realtime subscription to a crew's withdrawals (newest first). */
export function subscribeToCrewWithdrawals(
  crewId: string,
  onChange: (withdrawals: Withdrawal[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, WITHDRAWALS), where('crewId', '==', crewId)),
    (snap) => {
      // Sort client-side (newest first) to avoid a composite index.
      const list = snap.docs.map(toWithdrawal).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onChange(list);
    },
    (err) => {
      console.warn('[withdrawals] listener error:', err);
      onError?.(err as Error);
    }
  );
}
