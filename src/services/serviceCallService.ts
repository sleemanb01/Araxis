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
import { assertWritable, isViewerReadOnly } from './demoMode';
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
  // The read-only viewer sees real numbers but NOT real identities: every
  // client name and phone is masked at the data's single entry point, so no
  // screen can leak them.
  const mask = isViewerReadOnly();
  return {
    id: snap.id,
    clientName: mask ? 'לקוח' : d.clientName ?? '',
    address: d.address ?? undefined,
    contactPhone: d.contactPhone ? (mask ? '+972 500000000' : d.contactPhone) : undefined,
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
  const snap = await getDocs(collection(db, CALLS));
  return snap.docs.map(toCall);
}

/** One-shot fetch of a call's financials (the viewFinancials-gated subcollection). */
export async function getFinancials(callId: string): Promise<PrivateFinancials | null> {
  const snap = await getDoc(doc(db, CALLS, callId, 'privateData', FINANCIALS));
  const d = snap.data();
  return d ? (d as PrivateFinancials) : null;
}

/**
 * ALL financials in ONE collection-group query (vs. one read per call).
 * Needs no call ids, so it can run in PARALLEL with the calls fetch.
 * Throws while the collection-group rule isn't deployed — callers fall back.
 */
export async function getAllFinancialsCG(): Promise<Record<string, PrivateFinancials>> {
  const snap = await getDocs(collectionGroup(db, 'privateData'));
  const out: Record<string, PrivateFinancials> = {};
  snap.docs.forEach((d) => {
    const callId = d.ref.parent.parent?.id;
    if (d.id === FINANCIALS && callId) out[callId] = d.data() as PrivateFinancials;
  });
  return out;
}

export async function createServiceCall(payload: CreateServiceCallPayload): Promise<string> {
  assertWritable();
  const ref = await addDoc(collection(db, CALLS), payload);
  return ref.id;
}

export async function updateServiceCall(
  id: string,
  patch: Partial<ServiceCall>
): Promise<void> {
  assertWritable();
  await updateDoc(doc(db, CALLS, id), patch as { [k: string]: any });
}

// ---- Admin-only financials (privateData subcollection) ----

export function subscribeToFinancials(
  callId: string,
  onChange: (fin: PrivateFinancials | null) => void,
  onError?: (e: Error) => void
): () => void {
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
  assertWritable();
  await setDoc(doc(db, CALLS, callId, 'privateData', FINANCIALS), fin, { merge: true });
}
