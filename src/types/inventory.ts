/**
 * Master inventory ledger (collection `inventory`). Stock is tracked per
 * location in a map: the warehouse plus one entry per team vehicle
 * (e.g. "warehouse", "car_alpha", "car_bravo").
 */
export interface InventoryItem {
  id: string;
  itemName: string;
  locations: Record<string, number>; // location key -> quantity on hand
}

export type CreateInventoryPayload = Omit<InventoryItem, 'id'>;

/** The master-stock location key. */
export const WAREHOUSE = 'warehouse';

/** Flag low stock when the total across all locations is at/below this. */
export const LOW_STOCK_THRESHOLD = 3;

export function totalQty(i: InventoryItem): number {
  return Object.values(i.locations).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function qtyAt(i: InventoryItem, location: string): number {
  return i.locations[location] ?? 0;
}

export function isLowStock(i: InventoryItem): boolean {
  return totalQty(i) <= LOW_STOCK_THRESHOLD;
}
