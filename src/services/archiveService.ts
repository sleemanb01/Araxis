/**
 * Data-retention archive. Every cycle we keep ONLY the monthly profit totals
 * (doc `archives/summary`) and delete the underlying service calls + financials.
 * Read/written by financial managers. Modular RN Firebase API.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';

const ARCHIVES = 'archives';
const SUMMARY = 'summary';
const CALLS = 'serviceCalls';
const FINANCIALS = 'financials';

export interface ArchiveSummary {
  monthlyProfit: Record<string, number>; // "YYYY-MM" -> archived profit total
  lastExportAt: string | null;
}

export function subscribeToArchive(
  onChange: (a: ArchiveSummary) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, ARCHIVES, SUMMARY),
    (snap) => {
      const d = snap.data() ?? {};
      onChange({
        monthlyProfit: d.monthlyProfit && typeof d.monthlyProfit === 'object' ? d.monthlyProfit : {},
        lastExportAt: typeof d.lastExportAt === 'string' ? d.lastExportAt : null,
      });
    },
    (err) => {
      console.warn('[archive] listener error:', err);
      onError?.(err as Error);
    }
  );
}

/** Stamp lastExportAt = now if the cycle hasn't started yet. */
export async function initArchiveIfMissing(): Promise<void> {
  const ref = doc(db, ARCHIVES, SUMMARY);
  const d = (await getDoc(ref)).data();
  if (!d || typeof d.lastExportAt !== 'string') {
    await setDoc(ref, { lastExportAt: new Date().toISOString() }, { merge: true });
  }
}

/**
 * Merge per-month profit into the archive, stamp the export time, then DELETE
 * every service call + its financials doc (chunked batches). Monthly totals
 * survive; everything else is erased.
 */
export async function archiveAndErase(monthlyDelta: Record<string, number>): Promise<void> {
  const ref = doc(db, ARCHIVES, SUMMARY);
  const cur = (await getDoc(ref)).data() ?? {};
  const merged: Record<string, number> = { ...(cur.monthlyProfit ?? {}) };
  Object.entries(monthlyDelta).forEach(([k, v]) => {
    merged[k] = (merged[k] ?? 0) + v;
  });
  await setDoc(ref, { monthlyProfit: merged, lastExportAt: new Date().toISOString() }, { merge: true });

  const snap = await getDocs(collection(db, CALLS));
  let batch = writeBatch(db);
  let n = 0;
  for (const c of snap.docs) {
    batch.delete(doc(db, CALLS, c.id, 'privateData', FINANCIALS));
    batch.delete(doc(db, CALLS, c.id));
    n += 2;
    if (n >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}
