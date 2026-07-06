/**
 * Monthly profit targets — a single doc `targets/monthly` holding a map of
 * month key ("YYYY-MM") -> target amount. Read/written by financial managers.
 * Modular RN Firebase API.
 */

import { doc, getDoc, onSnapshot, setDoc } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { isDemo } from './demoMode';
import { demoSubscribe, demoTargets, demoSetTarget } from './demoStore';

const TARGETS = 'targets';
const DOC = 'monthly';

/** Realtime subscription to the month -> target amount map. */
export function subscribeToTargets(
  onChange: (targets: Record<string, number>) => void,
  onError?: (e: Error) => void
): () => void {
  if (isDemo()) return demoSubscribe(demoTargets, onChange);
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

/** One-shot fetch of the targets map (used to hydrate viewer mode). */
export async function getTargetsOnce(): Promise<Record<string, number>> {
  if (isDemo()) return demoTargets();
  const d = (await getDoc(doc(db, TARGETS, DOC))).data() ?? {};
  const out: Record<string, number> = {};
  Object.keys(d).forEach((k) => {
    if (typeof d[k] === 'number') out[k] = d[k];
  });
  return out;
}

/** Set the target for a month ("YYYY-MM"). */
export async function setMonthTarget(month: string, amount: number): Promise<void> {
  if (isDemo()) return demoSetTarget(month, amount);
  await setDoc(doc(db, TARGETS, DOC), { [month]: amount }, { merge: true });
}
