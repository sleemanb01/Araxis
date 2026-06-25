/**
 * Service-call service — Cloud Firestore (collection: "serviceCalls").
 * The live listener is time-bounded (today onward) to keep the dashboard light.
 * Financials live in an admin-only subcollection: serviceCalls/{id}/privateData/financials.
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import {
  ServiceCall,
  ServiceCallStatus,
  CreateServiceCallPayload,
  PrivateFinancials,
} from '../types/serviceCall';

const CALLS = 'serviceCalls';
const FINANCIALS = 'financials';

/** Local midnight as an ISO string (scheduledDate is stored ISO, which sorts chronologically). */
export function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toCall(snap: { id: string; data: () => any }): ServiceCall {
  const d = snap.data();
  return {
    id: snap.id,
    clientName: d.clientName ?? '',
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
 * Realtime subscription to upcoming calls (scheduled today onward). Security
 * rules further restrict reads to the crew assigned to each call (or admins).
 */
export function subscribeToUpcomingCalls(
  onChange: (calls: ServiceCall[]) => void,
  onError?: (e: Error) => void
): () => void {
  const q = query(collection(db, CALLS), where('scheduledDate', '>=', startOfTodayISO()));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map(toCall)),
    (err) => {
      console.warn('[serviceCalls] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function createServiceCall(payload: CreateServiceCallPayload): Promise<string> {
  const ref = await addDoc(collection(db, CALLS), payload);
  return ref.id;
}

export async function updateServiceCall(
  id: string,
  patch: Partial<ServiceCall>
): Promise<void> {
  await updateDoc(doc(db, CALLS, id), patch as { [k: string]: any });
}

export async function setCallStatus(id: string, status: ServiceCallStatus): Promise<void> {
  await updateDoc(doc(db, CALLS, id), { status });
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
  await setDoc(doc(db, CALLS, callId, 'privateData', FINANCIALS), fin, { merge: true });
}
