/**
 * Shared calls+financials fetch for the financial screens (profile rings,
 * לוח כספים, jobs months). One flight at a time, cached briefly, so navigating
 * between screens doesn't re-read the whole collection every time.
 */
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getAllCalls, getAllFinancialsByCallId } from '../services/serviceCallService';
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';

export interface FinancialData {
  calls: ServiceCall[];
  /** fins[i] ↔ calls[i] (the shape the finance utils take). */
  fins: (PrivateFinancials | null)[];
  finsById: Record<string, PrivateFinancials | null>;
}

const TTL_MS = 15_000;
let cache: { at: number; data: FinancialData } | null = null;
let inflight: Promise<FinancialData> | null = null;
const listeners = new Set<() => void>();

export async function fetchFinancialData(force = false): Promise<FinancialData> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (!inflight) {
    inflight = (async () => {
      try {
        const calls = await getAllCalls();
        const finsById = await getAllFinancialsByCallId(calls.map((c) => c.id));
        const data: FinancialData = { calls, fins: calls.map((c) => finsById[c.id] ?? null), finsById };
        cache = { at: Date.now(), data };
        return data;
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Drop the cache and refetch in every mounted consumer (e.g. after the erase). */
export function invalidateFinancialData(): void {
  cache = null;
  listeners.forEach((l) => l());
}

export function useFinancialData(enabled: boolean): FinancialData & { loading: boolean } {
  const [data, setData] = useState<FinancialData | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(enabled && !cache);

  useEffect(() => {
    if (!enabled) return;
    let on = true;
    const load = () =>
      fetchFinancialData()
        .then((d) => {
          if (on) {
            setData(d);
            setLoading(false);
          }
        })
        .catch(() => on && setLoading(false));
    load();
    listeners.add(load);
    return () => {
      on = false;
      listeners.delete(load);
    };
  }, [enabled]);

  // Tab screens stay mounted forever — also refresh whenever the screen gains
  // focus (the TTL keeps rapid tab-switching from re-reading the collection).
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let on = true;
      fetchFinancialData()
        .then((d) => {
          if (on) {
            setData(d);
            setLoading(false);
          }
        })
        .catch(() => {});
      return () => {
        on = false;
      };
    }, [enabled])
  );

  return { calls: data?.calls ?? [], fins: data?.fins ?? [], finsById: data?.finsById ?? {}, loading };
}
