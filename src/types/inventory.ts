export type ItemLocation = 'warehouse' | 'vehicle';

export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  category: string;
  warehouseQty: number; // units in the warehouse
  vehicleQty: number;   // units loaded in the car/van
}

export type CreateInventoryPayload = Omit<InventoryItem, 'id'>;

/** Flag an item as low-stock when its total across both locations is at/below this. */
export const LOW_STOCK_THRESHOLD = 3;

export function totalQty(i: InventoryItem): number {
  return i.warehouseQty + i.vehicleQty;
}

export function qtyAt(i: InventoryItem, loc: ItemLocation): number {
  return loc === 'warehouse' ? i.warehouseQty : i.vehicleQty;
}

export function isLowStock(i: InventoryItem): boolean {
  return totalQty(i) <= LOW_STOCK_THRESHOLD;
}
