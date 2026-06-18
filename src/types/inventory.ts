export type ItemLocation = 'warehouse' | 'vehicle';

export interface InventoryItem {
  id: string;
  barcode: string;
  name: string;
  quantity: number;
  location: ItemLocation;
}

export type ScanResult = { barcode: string; item: InventoryItem | null };
