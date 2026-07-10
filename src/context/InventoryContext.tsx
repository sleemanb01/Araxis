import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { subscribeToInventory } from '../services/inventoryService';
import { InventoryItem } from '../types/inventory';
import { useUser } from './UserContext';

interface InventoryValue {
  items: InventoryItem[]; // master ledger
  loading: boolean;
}

const InventoryContext = createContext<InventoryValue | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const { provisioned } = useUser();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provisioned) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToInventory(
      (i) => {
        setItems(i);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, [provisioned]);

  const value = useMemo<InventoryValue>(() => ({ items, loading }), [items, loading]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryValue {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within an InventoryProvider');
  return ctx;
}
