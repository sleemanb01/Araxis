/**
 * Service catalog — the shared list of service types (collection: "services").
 * Read by everyone signed in; anyone can add a new one (deduped by name).
 * Modular RN Firebase API.
 */

import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { ServiceOption } from '../types/serviceCatalog';

const SERVICES = 'services';

/** Realtime subscription to the shared service catalog (sorted by name). */
export function subscribeToServices(
  onChange: (services: ServiceOption[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, SERVICES),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, name: d.data().name ?? '' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'he'));
      onChange(list);
    },
    (err) => {
      console.warn('[services] listener error:', err);
      onError?.(err as Error);
    }
  );
}

/**
 * Add a service to the shared catalog if it doesn't already exist (case/space
 * insensitive). Returns the canonical trimmed name.
 */
export async function addService(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const existing = await getDocs(query(collection(db, SERVICES), where('name', '==', trimmed)));
  if (existing.empty) await addDoc(collection(db, SERVICES), { name: trimmed });
  return trimmed;
}
