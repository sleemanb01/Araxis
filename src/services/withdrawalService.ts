/**
 * Withdrawal log — warehouse→crew withdrawals (collection: "withdrawals").
 * Entries are written by inventoryService.withdrawToCrew (batched with the stock
 * move). Read per crew for its history. Modular RN Firebase API.
 */

import { collection, getDocs, onSnapshot, query, where } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { isDemo } from './demoMode';
import { demoSubscribe, demoWithdrawals } from './demoStore';
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

/** One-shot fetch of a crew's withdrawals (used to hydrate viewer mode). */
export async function getCrewWithdrawalsOnce(crewId: string): Promise<Withdrawal[]> {
  if (isDemo()) return demoWithdrawals(crewId);
  const snap = await getDocs(query(collection(db, WITHDRAWALS), where('crewId', '==', crewId)));
  return snap.docs.map(toWithdrawal);
}

/** Realtime subscription to a crew's withdrawals (newest first). */
export function subscribeToCrewWithdrawals(
  crewId: string,
  onChange: (withdrawals: Withdrawal[]) => void,
  onError?: (e: Error) => void
): () => void {
  if (isDemo()) return demoSubscribe(() => demoWithdrawals(crewId), onChange);
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
