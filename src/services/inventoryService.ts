/**
 * Inventory service — Cloud Firestore (collection: "inventory").
 * Each product holds stock in two places: warehouseQty + vehicleQty.
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  onSnapshot,
  increment,
  writeBatch,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import {
  InventoryItem,
  ItemLocation,
  CreateInventoryPayload,
} from '../types/inventory';
import { SEED_INVENTORY } from './seedData';

const INVENTORY = 'inventory';

function toItem(snap: { id: string; data: () => any }): InventoryItem {
  const d = snap.data();
  // Back-compat: older docs stored a single `quantity` + `location`.
  let warehouseQty: number | undefined =
    typeof d.warehouseQty === 'number' ? d.warehouseQty : undefined;
  let vehicleQty: number | undefined =
    typeof d.vehicleQty === 'number' ? d.vehicleQty : undefined;
  if (warehouseQty === undefined && vehicleQty === undefined) {
    const q = typeof d.quantity === 'number' ? d.quantity : 0;
    const onVehicle = d.location === 'vehicle';
    warehouseQty = onVehicle ? 0 : q;
    vehicleQty = onVehicle ? q : 0;
  }
  return {
    id: snap.id,
    barcode: d.barcode ?? '',
    name: d.name ?? '',
    category: d.category ?? '',
    warehouseQty: warehouseQty ?? 0,
    vehicleQty: vehicleQty ?? 0,
  };
}

const fieldFor = (loc: ItemLocation) =>
  loc === 'warehouse' ? 'warehouseQty' : 'vehicleQty';

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

/** Adjust the stock in one location by a (possibly negative) delta. */
export async function adjustQuantity(
  id: string,
  location: ItemLocation,
  delta: number
): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), { [fieldFor(location)]: increment(delta) });
}

/** Atomically move `qty` units between locations in a single write. */
export async function transfer(
  id: string,
  qty: number,
  direction: 'toVehicle' | 'toWarehouse'
): Promise<void> {
  if (qty <= 0) return;
  const toVehicle = direction === 'toVehicle';
  await updateDoc(doc(db, INVENTORY, id), {
    warehouseQty: increment(toVehicle ? -qty : qty),
    vehicleQty: increment(toVehicle ? qty : -qty),
  });
}

export async function createInventoryItem(
  payload: CreateInventoryPayload
): Promise<void> {
  await addDoc(collection(db, INVENTORY), payload);
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<InventoryItem>
): Promise<void> {
  await updateDoc(doc(db, INVENTORY, id), patch as { [k: string]: any });
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
