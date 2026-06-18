/**
 * Inventory service — placeholder implementations.
 * Replace each function body with real API calls when the backend is ready.
 */

import { InventoryItem, ScanResult } from '../types/inventory';

export async function fetchInventory(): Promise<InventoryItem[]> {
  // TODO: GET /api/inventory
  throw new Error('fetchInventory: not yet connected to backend');
}

export async function scanBarcode(barcode: string): Promise<ScanResult> {
  // TODO: GET /api/inventory/scan/:barcode
  throw new Error('scanBarcode: not yet connected to backend');
}

export async function updateItemQuantity(id: string, quantity: number): Promise<InventoryItem> {
  // TODO: PATCH /api/inventory/:id  { quantity }
  throw new Error('updateItemQuantity: not yet connected to backend');
}

export async function transferItem(
  id: string,
  from: 'warehouse' | 'vehicle',
  to: 'warehouse' | 'vehicle'
): Promise<InventoryItem> {
  // TODO: POST /api/inventory/:id/transfer  { from, to }
  throw new Error('transferItem: not yet connected to backend');
}
