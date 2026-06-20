/**
 * Customer service — provider-owned customer book (collection: "customers").
 * Shared among verified technicians (same model as jobs/inventory), with a
 * `createdBy` field for attribution. Modular RN Firebase API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { getCurrentUser } from './authService';
import { Customer, CreateCustomerPayload } from '../types/customer';
import { SEED_CUSTOMERS } from './seedData';

const CUSTOMERS = 'customers';

function toCustomer(snap: { id: string; data: () => any }): Customer {
  const d = snap.data();
  return {
    id: snap.id,
    name: d.name ?? '',
    phone: d.phone ?? '',
    address: d.address ?? '',
    notes: d.notes ?? undefined,
    userId: d.userId ?? null,
    createdAt: d.createdAt ?? new Date().toISOString(),
    createdBy: d.createdBy ?? '',
  };
}

/** Real-time subscription to the customer book (A→Z by name). */
export function subscribeToCustomers(
  onChange: (customers: Customer[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, CUSTOMERS), orderBy('name')),
    (snap) => onChange(snap.docs.map(toCustomer)),
    (err) => {
      console.warn('[customers] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const snap = await getDoc(doc(db, CUSTOMERS, id));
  const data = snap.data();
  return data ? toCustomer({ id: snap.id, data: () => data }) : null;
}

/** One-shot lookup by exact phone (used to avoid duplicate customers). */
export async function findByPhone(phone: string): Promise<Customer | null> {
  const snap = await getDocs(
    query(collection(db, CUSTOMERS), where('phone', '==', phone), limit(1))
  );
  return snap.empty ? null : toCustomer(snap.docs[0]);
}

export async function createCustomer(payload: CreateCustomerPayload): Promise<void> {
  await addDoc(collection(db, CUSTOMERS), {
    ...payload,
    createdBy: getCurrentUser()?.uid ?? '',
    createdAt: new Date().toISOString(),
  });
}

export async function updateCustomer(
  id: string,
  patch: Partial<Customer>
): Promise<void> {
  await updateDoc(doc(db, CUSTOMERS, id), patch as { [k: string]: any });
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, CUSTOMERS, id));
}

/** Dev convenience: populate the collection from SEED_CUSTOMERS if it's empty. */
export async function seedCustomersIfEmpty(): Promise<boolean> {
  const snap = await getDocs(collection(db, CUSTOMERS));
  if (!snap.empty) return false;
  const createdBy = getCurrentUser()?.uid ?? '';
  const createdAt = new Date().toISOString();
  const batch = writeBatch(db);
  SEED_CUSTOMERS.forEach((c) =>
    batch.set(doc(collection(db, CUSTOMERS)), { ...c, createdBy, createdAt })
  );
  await batch.commit();
  return true;
}
