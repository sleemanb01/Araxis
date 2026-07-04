/**
 * Service-call service — Cloud Firestore (collection: "serviceCalls").
 * The live listener is time-bounded (today onward) to keep the dashboard light.
 * Financials live in an admin-only subcollection: serviceCalls/{id}/privateData/financials.
 * Modular RN Firebase API.
 */

import {
  collection,
  collectionGroup,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  getDocs,
  getDoc,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { isDemo } from './demoMode';
import {
  demoSubscribe,
  demoCalls,
  demoCall,
  demoFin,
  demoFins,
  demoCreateCall,
  demoUpdateCall,
  demoSetFin,
} from './demoStore';
import {
  ServiceCall,
  ServiceCallStatus,
  CreateServiceCallPayload,
  PrivateFinancials,
} from '../types/serviceCall';

const CALLS = 'serviceCalls';
const FINANCIALS = 'financials';


function toCall(snap: { id: string; data: () => any }): ServiceCall {
  const d = snap.data();
  return {
    id: snap.id,
    clientName: d.clientName ?? '',
    address: d.address ?? undefined,
    contactPhone: d.contactPhone ?? undefined,
    notes: d.notes ?? undefined,
    requiredItems: Array.isArray(d.requiredItems) ? d.requiredItems : undefined,
    itemQuantities:
      d.itemQuantities && typeof d.itemQuantities === 'object' ? d.itemQuantities : undefined,
    checkedItems: Array.isArray(d.checkedItems) ? d.checkedItems : undefined,
    crewId: d.crewId ?? undefined,
    itemPrices: d.itemPrices && typeof d.itemPrices === 'object' ? d.itemPrices : undefined,
    reminderSentAt: typeof d.reminderSentAt === 'string' ? d.reminderSentAt : undefined,
    status: (d.status ?? 'pending') as ServiceCallStatus,
    scheduledDate: d.scheduledDate ?? new Date().toISOString(),
    hardwareUsed: Array.isArray(d.hardwareUsed) ? d.hardwareUsed : [],
    teamAssignment: {
      leadTech: d.teamAssignment?.leadTech ?? '',
      assistants: Array.isArray(d.teamAssignment?.assistants) ? d.teamAssignment.assistants : [],
    },
    payouts: {
      totalTechPayout:
        typeof d.payouts?.totalTechPayout === 'number' ? d.payouts.totalTechPayout : 0,
      splits:
        d.payouts?.splits && typeof d.payouts.splits === 'object' ? d.payouts.splits : {},
    },
  };
}

/**
 * Realtime subscription to service calls — past and upcoming. The collection
 * stays small because the bi-monthly export-and-erase clears history, so an
 * unbounded listener is still a bounded amount of data. Security rules further
 * restrict reads to the crew assigned to each call (or admins).
 */
export function subscribeToUpcomingCalls(
  onChange: (calls: ServiceCall[]) => void,
  onError?: (e: Error) => void
): () => void {
  if (isDemo()) return demoSubscribe(demoCalls, onChange);
  return onSnapshot(
    collection(db, CALLS),
    (snap) => onChange(snap.docs.map(toCall)),
    (err) => {
      console.warn('[serviceCalls] listener error:', err);
      onError?.(err as Error);
    }
  );
}

/** Realtime subscription to a single call by id (works for past/history calls too). */
export function subscribeToCall(
  callId: string,
  onChange: (call: ServiceCall | null) => void,
  onError?: (e: Error) => void
): () => void {
  if (isDemo()) return demoSubscribe(() => demoCall(callId), onChange);
  return onSnapshot(
    doc(db, CALLS, callId),
    (snap) => {
      const d = snap.data();
      onChange(d ? toCall(snap) : null);
    },
    (err) => {
      console.warn('[serviceCall] listener error:', err);
      onError?.(err as Error);
    }
  );
}

/** One-shot fetch of all service calls (for the financial dashboard). */
export async function getAllCalls(): Promise<ServiceCall[]> {
  if (isDemo()) return demoCalls();
  const snap = await getDocs(collection(db, CALLS));
  return snap.docs.map(toCall);
}

/** One-shot fetch of a call's financials (the viewFinancials-gated subcollection). */
export async function getFinancials(callId: string): Promise<PrivateFinancials | null> {
  if (isDemo()) return demoFin(callId);
  const snap = await getDoc(doc(db, CALLS, callId, 'privateData', FINANCIALS));
  const d = snap.data();
  return d ? (d as PrivateFinancials) : null;
}

/**
 * ALL financials in ONE collection-group query (vs. one read per call).
 * Falls back to per-call reads if the collection-group rule isn't deployed yet.
 */
export async function getAllFinancialsByCallId(
  callIds: string[]
): Promise<Record<string, PrivateFinancials | null>> {
  const out: Record<string, PrivateFinancials | null> = {};
  callIds.forEach((id) => (out[id] = null));
  if (isDemo()) {
    const all = demoFins();
    callIds.forEach((id) => (out[id] = all[id] ?? null));
    return out;
  }
  try {
    const snap = await getDocs(collectionGroup(db, 'privateData'));
    snap.docs.forEach((d) => {
      const callId = d.ref.parent.parent?.id;
      if (d.id === FINANCIALS && callId && callId in out) {
        out[callId] = d.data() as PrivateFinancials;
      }
    });
    return out;
  } catch {
    // Rules for the collection-group read not deployed yet — fall back.
    const fins = await Promise.all(callIds.map((id) => getFinancials(id).catch(() => null)));
    callIds.forEach((id, i) => (out[id] = fins[i]));
    return out;
  }
}

export async function createServiceCall(payload: CreateServiceCallPayload): Promise<string> {
  if (isDemo()) return demoCreateCall(payload);
  const ref = await addDoc(collection(db, CALLS), payload);
  return ref.id;
}

export async function updateServiceCall(
  id: string,
  patch: Partial<ServiceCall>
): Promise<void> {
  if (isDemo()) return demoUpdateCall(id, patch);
  await updateDoc(doc(db, CALLS, id), patch as { [k: string]: any });
}

export async function setCallStatus(id: string, status: ServiceCallStatus): Promise<void> {
  if (isDemo()) return demoUpdateCall(id, { status });
  await updateDoc(doc(db, CALLS, id), { status });
}

// ---- Admin-only financials (privateData subcollection) ----

export function subscribeToFinancials(
  callId: string,
  onChange: (fin: PrivateFinancials | null) => void,
  onError?: (e: Error) => void
): () => void {
  if (isDemo()) return demoSubscribe(() => demoFin(callId), onChange);
  return onSnapshot(
    doc(db, CALLS, callId, 'privateData', FINANCIALS),
    (snap) => {
      const d = snap.data();
      onChange(d ? (d as PrivateFinancials) : null);
    },
    (err) => {
      console.warn('[financials] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function setFinancials(
  callId: string,
  fin: PrivateFinancials
): Promise<void> {
  if (isDemo()) return demoSetFin(callId, fin);
  await setDoc(doc(db, CALLS, callId, 'privateData', FINANCIALS), fin, { merge: true });
}
