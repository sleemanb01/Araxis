/**
 * Monthly profit targets — a single doc `targets/monthly` holding a map of
 * month key ("YYYY-MM") -> target amount. Read/written by financial managers.
 * Modular RN Firebase API.
 */

import { doc, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { db } from './firebase';

const TARGETS = 'targets';
const DOC = 'monthly';

/** Realtime subscription to the month -> target amount map. */
export function subscribeToTargets(
  onChange: (targets: Record<string, number>) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, TARGETS, DOC),
    (snap) => {
      const d = snap.data() ?? {};
      const out: Record<string, number> = {};
      Object.keys(d).forEach((k) => {
        if (typeof d[k] === 'number') out[k] = d[k];
      });
      onChange(out);
    },
    (err) => {
      console.warn('[targets] listener error:', err);
      onError?.(err as Error);
    }
  );
}

/** Set the target for a month ("YYYY-MM"). */
export async function setMonthTarget(month: string, amount: number): Promise<void> {
  await setDoc(doc(db, TARGETS, DOC), { [month]: amount }, { merge: true });
}
