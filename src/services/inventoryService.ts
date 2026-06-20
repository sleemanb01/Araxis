/**
 * Inventory service — backed by Cloud Firestore (collection: "inventory").
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  updateDoc,
  getDocs,
  onSnapshot,
  increment,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { InventoryItem, ItemLocation } from '../types/inventory';
import { SEED_INVENTORY } from './seedData';

const INVENTORY = 'inventory';

function toItem(snap: { id: string; data: () => any }): InventoryItem {
  const d = snap.data();
  return {
    id: snap.id,
    barcode: d.barcode ?? '',
    name: d.name ?? '',
    quantity: typeof d.quantity === 'number' ? d.quantity : 0,
    location: (d.location ?? 'warehouse') as ItemLocation,
  };
}

/** Real-time subscription to inventory. Returns an unsubscribe function. */
export function subscribeToInventory(
  onChange: (items: InventoryItem[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, INVENTORY),
    (snap) => onChange(snap.docs.map(toItem)),
    (err) => {
      console.warn('[inventory] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function adjustQuantity(id: string, delta: number): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), { quantity: increment(delta) });
}

export async function setLocation(id: string, location: ItemLocation): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), { location });
}

/** Dev convenience: populate the collection from SEED_INVENTORY if it's empty. */
export async function seedInventoryIfEmpty(): Promise<boolean> {
  const snap = await getDocs(collection(db, INVENTORY));
  if (!snap.empty) return false;
  const batch = writeBatch(db);
  SEED_INVENTORY.forEach((i) => batch.set(doc(collection(db, INVENTORY)), i));
  await batch.commit();
  return true;
}
