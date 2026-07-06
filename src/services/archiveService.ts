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
  where,
  writeBatch,
} from '@react-native-firebase/firestore';

/** Modular-API document reference (what doc()/snapshot.ref return). */
type DocRef = ReturnType<typeof doc>;
import { db } from './firebase';
import { isDemo } from './demoMode';
import { demoSubscribe, demoArchive, demoArchiveAndErase } from './demoStore';

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
  if (isDemo()) return demoSubscribe(demoArchive, onChange);
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

/** One-shot fetch of the archive summary (used to hydrate viewer mode). */
export async function getArchiveOnce(): Promise<ArchiveSummary> {
  if (isDemo()) return demoArchive();
  const d = (await getDoc(doc(db, ARCHIVES, SUMMARY))).data() ?? {};
  return {
    monthlyProfit: d.monthlyProfit && typeof d.monthlyProfit === 'object' ? d.monthlyProfit : {},
    lastExportAt: typeof d.lastExportAt === 'string' ? d.lastExportAt : null,
  };
}

/** Stamp lastExportAt = now if the cycle hasn't started yet. */
export async function initArchiveIfMissing(): Promise<void> {
  if (isDemo()) return;
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
  if (isDemo()) return demoArchiveAndErase(monthlyDelta);
  const ref = doc(db, ARCHIVES, SUMMARY);
  const cur = (await getDoc(ref)).data() ?? {};
  const merged: Record<string, number> = { ...(cur.monthlyProfit ?? {}) };
  Object.entries(monthlyDelta).forEach(([k, v]) => {
    merged[k] = (merged[k] ?? 0) + v;
  });
  await setDoc(ref, { monthlyProfit: merged, lastExportAt: new Date().toISOString() }, { merge: true });

  // Only CLOSED jobs are erased. Jobs still awaiting another visit (pending /
  // active) SURVIVE the recycle together with their financials and payments —
  // their profit is archived only in the cycle where they complete.

  // Payment refs grouped by call in ONE collection-group query (no per-call
  // subcollection fetches).
  const paymentsByCall = new Map<string, DocRef[]>();
  (await getDocs(collectionGroup(db, 'payments'))).docs.forEach((p) => {
    const callId = p.ref.parent.parent?.id;
    if (!callId) return;
    const arr = paymentsByCall.get(callId) ?? [];
    arr.push(p.ref);
    paymentsByCall.set(callId, arr);
  });

  // Completed calls in pages; each page deletes call + financials + payments.
  // Deleted docs drop out of the next page query.
  const PAGE = 150;
  for (;;) {
    const snap = await getDocs(
      query(collection(db, CALLS), where('status', '==', 'completed'), limit(PAGE))
    );
    if (snap.empty) break;
    let batch = writeBatch(db);
    let n = 0;
    const push = async (ref: DocRef) => {
      batch.delete(ref);
      if (++n >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        n = 0;
      }
    };
    for (const d of snap.docs) {
      for (const pRef of paymentsByCall.get(d.id) ?? []) await push(pRef);
      await push(doc(db, CALLS, d.id, 'privateData', FINANCIALS));
      await push(d.ref);
    }
    if (n > 0) await batch.commit();
    if (snap.size < PAGE) break;
  }
}
