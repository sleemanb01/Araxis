/**
 * Appointment service — the calendar layer (collection: "appointments").
 * Decoupled from jobs so a scheduled visit can stand alone or link to a job
 * and/or customer. Shared among verified technicians. Modular RN Firebase API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { getCurrentUser } from './authService';
import {
  Appointment,
  AppointmentStatus,
  CreateAppointmentPayload,
} from '../types/appointment';
import { SEED_APPOINTMENTS } from './seedData';

const APPOINTMENTS = 'appointments';

function toAppointment(snap: { id: string; data: () => any }): Appointment {
  const d = snap.data();
  return {
    id: snap.id,
    jobId: d.jobId ?? null,
    customerId: d.customerId ?? null,
    technicianId: d.technicianId ?? null,
    title: d.title ?? '',
    startAt: d.startAt ?? new Date().toISOString(),
    endAt: d.endAt ?? null,
    status: (d.status ?? 'scheduled') as AppointmentStatus,
    createdAt: d.createdAt ?? new Date().toISOString(),
    createdBy: d.createdBy ?? '',
  };
}

/** Real-time subscription to all appointments, soonest first. */
export function subscribeToAppointments(
  onChange: (appointments: Appointment[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, APPOINTMENTS), orderBy('startAt')),
    (snap) => onChange(snap.docs.map(toAppointment)),
    (err) => {
      console.warn('[appointments] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function createAppointment(
  payload: CreateAppointmentPayload
): Promise<void> {
  await addDoc(collection(db, APPOINTMENTS), {
    ...payload,
    status: 'scheduled' as AppointmentStatus,
    createdBy: getCurrentUser()?.uid ?? '',
    createdAt: new Date().toISOString(),
  });
}

export async function updateAppointment(
  id: string,
  patch: Partial<Appointment>
): Promise<void> {
  await updateDoc(doc(db, APPOINTMENTS, id), patch as { [k: string]: any });
}

/** Soft-cancel (no client hard-delete; matches the jobs convention). */
export async function cancelAppointment(id: string): Promise<void> {
  await updateDoc(doc(db, APPOINTMENTS, id), { status: 'canceled' });
}

/** Dev convenience: populate the collection from SEED_APPOINTMENTS if it's empty. */
export async function seedAppointmentsIfEmpty(): Promise<boolean> {
  const snap = await getDocs(collection(db, APPOINTMENTS));
  if (!snap.empty) return false;
  const createdBy = getCurrentUser()?.uid ?? '';
  const createdAt = new Date().toISOString();
  const batch = writeBatch(db);
  SEED_APPOINTMENTS.forEach((a) =>
    batch.set(doc(collection(db, APPOINTMENTS)), {
      ...a,
      status: 'scheduled' as AppointmentStatus,
      createdBy,
      createdAt,
    })
  );
  await batch.commit();
  return true;
}
