import { create } from 'zustand';
import { InventoryItem } from '../types/inventory';
import * as inventoryService from '../services/inventoryService';

interface InventoryStore {
  items: InventoryItem[];
  loading: boolean;
  lastScanned: InventoryItem | null;
  _unsub: (() => void) | null;

  init: () => Promise<void>;
  teardown: () => void;

  findByBarcode: (barcode: string) => InventoryItem | undefined;
  setLastScanned: (item: InventoryItem | null) => void;
  updateQuantity: (id: string, delta: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  loading: true,
  lastScanned: null,
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

  setLastScanned: (item) => set({ lastScanned: item }),

  // Write to Firestore; realtime listener updates local state.
  updateQuantity: (id, delta) => inventoryService.adjustQuantity(id, delta),
}));
