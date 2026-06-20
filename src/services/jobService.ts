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
import { Job, JobStatus, CreateJobPayload } from '../types/job';
import { SEED_JOBS } from './seedData';

const JOBS = 'jobs';

function toJob(snap: { id: string; data: () => any }): Job {
  const d = snap.data();
  return {
    id: snap.id,
    customerName: d.customerName ?? '',
    address: d.address ?? '',
    phone: d.phone ?? '',
    description: d.description ?? '',
    status: (d.status ?? 'awaiting') as JobStatus,
    assignedTo: d.assignedTo ?? null,
    createdAt: d.createdAt ?? new Date().toISOString(),
    scheduledAt: d.scheduledAt ?? null,
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
    createdAt: new Date().toISOString(),
    notes: [],
    photos: [],
  });
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  await updateDoc(doc(db, JOBS, id), { status });
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
