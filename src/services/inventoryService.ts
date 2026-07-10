/**
 * Inventory service — Cloud Firestore (collection: "inventory").
 * Stock is a per-location map (warehouse + each team vehicle). Hardware is
 * assigned to a service call via an atomic batch write (deduct + record).
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  increment,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { assertWritable } from './demoMode';
import { awaitWrite } from '../utils/promise';
import { InventoryItem, CreateInventoryPayload, WAREHOUSE, crewLocation } from '../types/inventory';

const INVENTORY = 'inventory';
const WITHDRAWALS = 'withdrawals';

function toItem(snap: { id: string; data: () => any }): InventoryItem {
  const d = snap.data();
  return {
    id: snap.id,
    itemName: d.itemName ?? d.name ?? '',
    barcode: d.barcode ?? undefined,
    price: typeof d.price === 'number' ? d.price : undefined,
    customerPrice: typeof d.customerPrice === 'number' ? d.customerPrice : undefined,
    lacks: d.lacks === true ? true : undefined,
    priority: d.priority === true ? true : undefined,
    criticalQty: typeof d.criticalQty === 'number' ? d.criticalQty : undefined,
    category: d.category === 'white' ? 'white' : undefined,
    locations: d.locations && typeof d.locations === 'object' ? d.locations : {},
  };
}

/** One-shot fetch of the whole ledger (used to hydrate viewer mode). */
export async function getAllItems(): Promise<InventoryItem[]> {
  const snap = await getDocs(collection(db, INVENTORY));
  return snap.docs.map(toItem);
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
  assertWritable();
  await awaitWrite(updateDoc(doc(db, INVENTORY, id), { [`locations.${location}`]: increment(delta) }));
}

/**
 * Withdraw `qty` of an item from the global warehouse into a crew's stock, and
 * log the withdrawal — all in ONE atomic batch (stock move + audit record).
 */
export async function withdrawToCrew(
  item: InventoryItem,
  qty: number,
  crewId: string,
  withdrawerId: string
): Promise<void> {
  assertWritable();
  if (qty <= 0) return;
  const batch = writeBatch(db);
  batch.update(doc(db, INVENTORY, item.id), {
    [`locations.${WAREHOUSE}`]: increment(-qty),
    [`locations.${crewLocation(crewId)}`]: increment(qty),
  });
  batch.set(doc(collection(db, WITHDRAWALS)), {
    crewId,
    itemId: item.id,
    itemName: item.itemName,
    withdrawerId,
    amount: qty,
    type: 'withdraw',
    createdAt: new Date().toISOString(),
  });
  await awaitWrite(batch.commit());
}

/**
 * Return `qty` of an item from a crew's stock back to the global warehouse, and
 * log it to the crew's history (type 'return') — atomically, like withdrawals.
 */
export async function returnToWarehouse(
  item: InventoryItem,
  qty: number,
  crewId: string,
  returnerId: string
): Promise<void> {
  assertWritable();
  if (qty <= 0) return;
  const batch = writeBatch(db);
  batch.update(doc(db, INVENTORY, item.id), {
    [`locations.${crewLocation(crewId)}`]: increment(-qty),
    [`locations.${WAREHOUSE}`]: increment(qty),
  });
  batch.set(doc(collection(db, WITHDRAWALS)), {
    crewId,
    itemId: item.id,
    itemName: item.itemName,
    withdrawerId: returnerId,
    amount: qty,
    type: 'return',
    createdAt: new Date().toISOString(),
  });
  await awaitWrite(batch.commit());
}

export async function createInventoryItem(payload: CreateInventoryPayload): Promise<string> {
  assertWritable();
  // Local id → creating an item works offline; the write queues and syncs.
  const ref = doc(collection(db, INVENTORY));
  await awaitWrite(setDoc(ref, payload));
  return ref.id;
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<InventoryItem>
): Promise<void> {
  assertWritable();
  await awaitWrite(updateDoc(doc(db, INVENTORY, id), patch as { [k: string]: any }));
}

export async function deleteInventoryItem(id: string): Promise<void> {
  assertWritable();
  await awaitWrite(deleteDoc(doc(db, INVENTORY, id)));
}
