import { create } from 'zustand';
import {
  InventoryItem,
  ItemLocation,
  CreateInventoryPayload,
  qtyAt,
  isLowStock,
} from '../types/inventory';
import * as inventoryService from '../services/inventoryService';

interface InventoryStore {
  items: InventoryItem[];
  loading: boolean;
  _unsub: (() => void) | null;

  init: () => Promise<void>;
  teardown: () => void;

  findByBarcode: (barcode: string) => InventoryItem | undefined;
  addItem: (payload: CreateInventoryPayload) => Promise<void>;
  updateItem: (id: string, patch: Partial<InventoryItem>) => Promise<void>;
  adjust: (id: string, location: ItemLocation, delta: number) => Promise<void>;
  transfer: (id: string, qty: number, direction: 'toVehicle' | 'toWarehouse') => Promise<void>;

  getCategories: () => string[];
  itemsAt: (location: ItemLocation) => InventoryItem[];
  lowStock: () => InventoryItem[];
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  loading: true,
  _unsub: null,

  init: async () => {
    if (get()._unsub) return;
    set({ loading: true });
    try {
      await inventoryService.seedInventoryIfEmpty();
    } catch (e) {
      console.warn('[inventory] seed skipped:', e);
    }
    const unsub = inventoryService.subscribeToInventory(
      (items) => set({ items, loading: false }),
      () => set({ loading: false })
    );
    set({ _unsub: unsub });
  },

  teardown: () => {
    get()._unsub?.();
    set({ _unsub: null, items: [], loading: true });
  },

  findByBarcode: (barcode) => get().items.find((i) => i.barcode === barcode),

  // Writes go to Firestore; the realtime listener updates local state.
  addItem: (payload) => inventoryService.createInventoryItem(payload),
  updateItem: (id, patch) => inventoryService.updateInventoryItem(id, patch),
  adjust: (id, location, delta) => inventoryService.adjustQuantity(id, location, delta),
  transfer: (id, qty, direction) => inventoryService.transfer(id, qty, direction),

  getCategories: () =>
    Array.from(
      new Set(get().items.map((i) => i.category).filter((c) => c.trim() !== ''))
    ).sort((a, b) => a.localeCompare(b, 'he')),

  itemsAt: (location) => get().items.filter((i) => qtyAt(i, location) > 0),
  lowStock: () => get().items.filter(isLowStock),
}));
