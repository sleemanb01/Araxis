import { create } from 'zustand';
import { Customer, CreateCustomerPayload } from '../types/customer';
import * as customerService from '../services/customerService';

interface CustomerStore {
  customers: Customer[];
  loading: boolean;
  _unsub: (() => void) | null;

  init: () => Promise<void>;
  teardown: () => void;

  add: (payload: CreateCustomerPayload) => Promise<void>;
  update: (id: string, patch: Partial<Customer>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  getById: (id: string) => Customer | undefined;
  findByPhone: (phone: string) => Customer | undefined;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  loading: true,
  _unsub: null,

  init: async () => {
    if (get()._unsub) return; // already subscribed
    set({ loading: true });
    try {
      await customerService.seedCustomersIfEmpty();
    } catch (e) {
      console.warn('[customers] seed skipped:', e);
    }
    const unsub = customerService.subscribeToCustomers(
      (customers) => set({ customers, loading: false }),
      () => set({ loading: false })
    );
    set({ _unsub: unsub });
  },

  teardown: () => {
    get()._unsub?.();
    set({ _unsub: null, customers: [], loading: true });
  },

  // Writes go to Firestore; the realtime listener updates local state.
  add: (payload) => customerService.createCustomer(payload),
  update: (id, patch) => customerService.updateCustomer(id, patch),
  remove: (id) => customerService.deleteCustomer(id),

  getById: (id) => get().customers.find((c) => c.id === id),
  findByPhone: (phone) => get().customers.find((c) => c.phone === phone),
}));
