import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { subscribeToUpcomingCalls } from '../services/serviceCallService';
import { ServiceCall } from '../types/serviceCall';
import { useUser } from './UserContext';

interface LiveMetricsValue {
  calls: ServiceCall[]; // upcoming calls (today onward) visible to this user
  loading: boolean;
}

const LiveMetricsContext = createContext<LiveMetricsValue | undefined>(undefined);

export function LiveMetricsProvider({ children }: { children: React.ReactNode }) {
  const { provisioned } = useUser();
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!provisioned) {
      setCalls([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = subscribeToUpcomingCalls(
      (c) => {
        setCalls(c);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe(); // cleanup prevents listener leaks
  }, [provisioned]);

  const value = useMemo<LiveMetricsValue>(() => ({ calls, loading }), [calls, loading]);

  return <LiveMetricsContext.Provider value={value}>{children}</LiveMetricsContext.Provider>;
}

export function useLiveMetrics(): LiveMetricsValue {
  const ctx = useContext(LiveMetricsContext);
  if (!ctx) throw new Error('useLiveMetrics must be used within a LiveMetricsProvider');
  return ctx;
}
