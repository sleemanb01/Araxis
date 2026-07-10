/**
 * Master inventory ledger (collection `inventory`). Stock is tracked per
 * location in a map: the warehouse plus one entry per team vehicle
 * (e.g. "warehouse", "car_alpha", "car_bravo").
 */
export interface InventoryItem {
  id: string;
  itemName: string;
  barcode?: string;                   // scanned/typed barcode (EAN/UPC/QR/etc.)
  price?: number;                     // unit COST price (manager-only, viewFinancials)
  customerPrice?: number;             // desired profit per unit from the customer (manager-only)
  lacks?: boolean;                    // flagged as missing/needed (added from a job)
  priority?: boolean;                 // high-priority item (stock rules)
  criticalQty?: number;               // per-item critical threshold (below = low stock)
  category?: ItemCategory;            // undefined = regular item
  locations: Record<string, number>; // location key -> quantity on hand
}

/** Inventory categories: regular items vs. white goods (appliances). */
export type ItemCategory = 'items' | 'white';
export const CATEGORY_HE: Record<ItemCategory, string> = {
  items: 'פריטים',
  white: 'מוצרים לבנים',
};

export type CreateInventoryPayload = Omit<InventoryItem, 'id'>;

/** The master-stock location key (global warehouse). */
export const WAREHOUSE = 'warehouse';

/** Each crew's stock is a location keyed `crew_<crewId>`. */
export const CREW_PREFIX = 'crew_';
export function crewLocation(crewId: string): string {
  return CREW_PREFIX + crewId;
}
export function isCrewLocation(key: string): boolean {
  return key.startsWith(CREW_PREFIX);
}
export function crewIdFromLocation(key: string): string {
  return key.slice(CREW_PREFIX.length);
}

/** Default low-stock threshold; items can override it via criticalQty (rules). */
const LOW_STOCK_THRESHOLD = 5;

function totalQty(i: InventoryItem): number {
  return Object.values(i.locations).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function qtyAt(i: InventoryItem, location: string): number {
  return i.locations[location] ?? 0;
}

export function isLowStock(i: InventoryItem): boolean {
  return totalQty(i) < (i.criticalQty ?? LOW_STOCK_THRESHOLD);
}
