/**
 * Data-retention archive. Every cycle we keep ONLY the monthly profit totals
 * (doc `archives/summary`) and delete the underlying service calls + financials.
 * Read/written by financial managers. Modular RN Firebase API.
 */

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
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

  // Chunked deletes — pages of docs, one batch per page, never the whole
  // collection in memory. Deleted docs drop out of the next page query.
  const PAGE = 150;

  // 1) All payment records in ONE collection-group query per page (no per-call
  //    subcollection fetches).
  for (;;) {
    const snap = await getDocs(query(collectionGroup(db, 'payments'), limit(PAGE)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    if (snap.size < PAGE) break;
  }

  // 2) The calls + their financials doc, paged (2 deletes per call ≤ 300/batch).
  for (;;) {
    const snap = await getDocs(query(collection(db, CALLS), limit(PAGE)));
    if (snap.empty) break;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.delete(doc(db, CALLS, d.id, 'privateData', FINANCIALS));
      batch.delete(d.ref);
    });
    await batch.commit();
    if (snap.size < PAGE) break;
  }
}
