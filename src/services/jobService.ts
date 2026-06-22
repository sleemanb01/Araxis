/**
 * Job service — backed by Cloud Firestore (collection: "jobs").
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  arrayUnion,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { Job, JobStatus, PaymentStatus, CreateJobPayload } from '../types/job';
import { SEED_JOBS } from './seedData';

const JOBS = 'jobs';

function toJob(snap: { id: string; data: () => any }): Job {
  const d = snap.data();
  return {
    id: snap.id,
    customerId: d.customerId ?? null,
    customerName: d.customerName ?? '',
    address: d.address ?? '',
    phone: d.phone ?? '',
    description: d.description ?? '',
    status: (d.status ?? 'awaiting') as JobStatus,
    assignedTo: d.assignedTo ?? null,
    createdAt: d.createdAt ?? new Date().toISOString(),
    scheduledAt: d.scheduledAt ?? null,
    price: typeof d.price === 'number' ? d.price : null,
    paidAmount: typeof d.paidAmount === 'number' ? d.paidAmount : null,
    paidAt: d.paidAt ?? null,
    paymentStatus: (d.paymentStatus as PaymentStatus) ?? 'unpaid',
    completionDate: d.completionDate ?? null,
    customerConfirmed: d.customerConfirmed === true,
    notes: Array.isArray(d.notes) ? d.notes : [],
    photos: Array.isArray(d.photos) ? d.photos : [],
  };
}

/** Real-time subscription to all jobs. Returns an unsubscribe function. */
export function subscribeToJobs(
  onChange: (jobs: Job[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, JOBS),
    (snap) => onChange(snap.docs.map(toJob)),
    (err) => {
      console.warn('[jobs] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function createJob(payload: CreateJobPayload): Promise<void> {
  await addDoc(collection(db, JOBS), {
    ...payload,
    customerId: payload.customerId ?? null,
    price: payload.price ?? null,
    createdAt: new Date().toISOString(),
    notes: [],
    photos: [],
  });
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { status });
}

/** Mark a job done — stamps completionDate so income is dated to when work finished. */
export async function completeJob(id: string): Promise<void> {
  await updateDoc(doc(db, JOBS, id), {
    status: 'completed',
    completionDate: new Date().toISOString(),
  });
}

export async function setPaymentStatus(
  id: string,
  paymentStatus: PaymentStatus
): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { paymentStatus });
}

/** Record how much has been paid; derives the paid/partial/unpaid status. */
export async function setPaidAmount(
  id: string,
  paidAmount: number,
  price: number | null
): Promise<void> {
  const status: PaymentStatus =
    paidAmount <= 0
      ? 'unpaid'
      : price != null && price > 0 && paidAmount >= price
      ? 'paid'
      : 'partial';
  await updateDoc(doc(db, JOBS, id), {
    paidAmount,
    paymentStatus: status,
    paidAt: new Date().toISOString(),
  });
}

export async function assignJob(id: string, techId: string | null): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { assignedTo: techId });
}

/** Claim a job for a tech with a date — assignment requires a scheduled date. */
export async function assignWithDate(id: string, techId: string, dateISO: string): Promise<void> {
  await updateDoc(doc(db, JOBS, id), {
    assignedTo: techId,
    scheduledAt: dateISO,
    status: 'scheduled',
  });
}

/** Release a job back to the shared pool. */
export async function unassignJob(id: string): Promise<void> {
  await updateDoc(doc(db, JOBS, id), {
    assignedTo: null,
    scheduledAt: null,
    status: 'awaiting',
  });
}

export async function setJobPrice(id: string, price: number | null): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { price });
}

/** Customer confirms the work is done (the only job change a customer can make). */
export async function confirmJobByCustomer(id: string): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { customerConfirmed: true });
}

export async function addJobNote(id: string, note: string): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { notes: arrayUnion(note) });
}

export async function addJobPhoto(id: string, uri: string): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { photos: arrayUnion(uri) });
}

/** Dev convenience: populate the collection from SEED_JOBS if it's empty. */
export async function seedJobsIfEmpty(): Promise<boolean> {
  const snap = await getDocs(collection(db, JOBS));
  if (!snap.empty) return false;
  const batch = writeBatch(db);
  SEED_JOBS.forEach((j) => batch.set(doc(collection(db, JOBS)), j));
  await batch.commit();
  return true;
}
