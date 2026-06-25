/**
 * Inventory service — Cloud Firestore (collection: "inventory").
 * Stock is a per-location map (warehouse + each team vehicle). Hardware is
 * assigned to a service call via an atomic batch write (deduct + record).
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  increment,
  arrayUnion,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { InventoryItem, CreateInventoryPayload } from '../types/inventory';

const INVENTORY = 'inventory';
const CALLS = 'serviceCalls';

function toItem(snap: { id: string; data: () => any }): InventoryItem {
  const d = snap.data();
  return {
    id: snap.id,
    itemName: d.itemName ?? d.name ?? '',
    barcode: d.barcode ?? undefined,
    locations: d.locations && typeof d.locations === 'object' ? d.locations : {},
  };
}

/** Real-time subscription to the master ledger. Returns an unsubscribe function. */
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

/** Adjust stock at one location by a (possibly negative) delta. */
export async function adjustQuantity(
  id: string,
  location: string,
  delta: number
): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), { [`locations.${location}`]: increment(delta) });
}

/** Atomically move `qty` units between two locations in a single write. */
export async function transfer(
  id: string,
  qty: number,
  from: string,
  to: string
): Promise<void> {
  if (qty <= 0 || from === to) return;
  await updateDoc(doc(db, INVENTORY, id), {
    [`locations.${from}`]: increment(-qty),
    [`locations.${to}`]: increment(qty),
  });
}

/**
 * Assign hardware to a service call: in ONE batch, deduct the unit from the
 * source location's stock and record the item id on the call's `hardwareUsed`.
 */
export async function assignHardwareToCall(
  itemId: string,
  fromLocation: string,
  ticketId: string,
  qty = 1
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, INVENTORY, itemId), {
    [`locations.${fromLocation}`]: increment(-qty),
  });
  batch.update(doc(db, CALLS, ticketId), { hardwareUsed: arrayUnion(itemId) });
  await batch.commit();
}

export async function createInventoryItem(payload: CreateInventoryPayload): Promise<void> {
  await addDoc(collection(db, INVENTORY), payload);
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<InventoryItem>
): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), patch as { [k: string]: any });
}
