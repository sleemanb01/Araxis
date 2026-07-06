/**
 * Suppliers — warehouse contact book (collection: "suppliers").
 * Modular RN Firebase API.
 */
import { collection, doc, addDoc, deleteDoc, onSnapshot } from '@react-native-firebase/firestore';
import { db } from './firebase';
import { assertWritable } from './demoMode';
import { Supplier } from '../types/supplier';

const SUPPLIERS = 'suppliers';

/** Realtime suppliers list, alphabetical. */
export function subscribeToSuppliers(
  onChange: (suppliers: Supplier[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, SUPPLIERS),
    (snap) => {
      const list = snap.docs.map((d) => {
        const s = d.data() as any;
        return { id: d.id, name: s.name ?? '', phone: s.phone ?? '', createdAt: s.createdAt } as Supplier;
      });
      list.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      onChange(list);
    },
    (err) => {
      console.warn('[suppliers] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function addSupplier(name: string, phone: string): Promise<void> {
  assertWritable();
  await addDoc(collection(db, SUPPLIERS), { name, phone, createdAt: new Date().toISOString() });
}

export async function deleteSupplier(id: string): Promise<void> {
  assertWritable();
  await deleteDoc(doc(db, SUPPLIERS, id));
}
