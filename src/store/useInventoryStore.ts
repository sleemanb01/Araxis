import { create } from 'zustand';
import { InventoryItem } from '../types/inventory';

const DUMMY_ITEMS: InventoryItem[] = [
  { id: '1', barcode: '7290000000001', name: 'פילטר אוויר 12"',   quantity: 8,  location: 'warehouse' },
  { id: '2', barcode: '7290000000002', name: 'גז פריאון R410A',    quantity: 3,  location: 'warehouse' },
  { id: '3', barcode: '7290000000003', name: 'שלט אוניברסלי',      quantity: 12, location: 'warehouse' },
  { id: '4', barcode: '7290000000004', name: 'חיבור נחושת 1/4"',   quantity: 50, location: 'vehicle'   },
  { id: '5', barcode: '7290000000005', name: 'תרמוסטט דיגיטלי',    quantity: 5,  location: 'vehicle'   },
];

interface InventoryStore {
  items: InventoryItem[];
  lastScanned: InventoryItem | null;

  findByBarcode: (barcode: string) => InventoryItem | undefined;
  setLastScanned: (item: InventoryItem | null) => void;
  updateQuantity: (id: string, delta: number) => void;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: DUMMY_ITEMS,
  lastScanned: null,

  findByBarcode: (barcode) => get().items.find((i) => i.barcode === barcode),

  setLastScanned: (item) => set({ lastScanned: item }),

  updateQuantity: (id, delta) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
      ),
    })),
}));
