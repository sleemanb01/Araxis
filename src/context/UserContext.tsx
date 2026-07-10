import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getIdTokenResult } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { subscribeToAuth, signOutUser, sendOtp, confirmOtp } from '../services/authService';
import { subscribeToProfile } from '../services/userService';
import { subscribeToMyCrews } from '../services/crewService';
import { initAppCheck } from '../services/appCheck';
import { isViewerReadOnly, setViewerReadOnly } from '../services/demoMode';
import { invalidateFinancialData } from '../hooks/useFinancialData';
import { withTimeout } from '../utils/promise';
import { UserProfile, Capabilities, NO_CAPS, toCaps } from '../types/user';
import { Crew } from '../types/crew';

interface UserContextValue {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  caps: Capabilities; // AUTHORITATIVE — UNION of caps across all the user's crews
  crews: Crew[]; // crews the user belongs to (manager or member)
  provisioned: boolean; // claim carries caps (an admin has set this user up)
  initializing: boolean;
  profileLoaded: boolean;
  claimLoaded: boolean;
  needsRegistration: boolean; // signed in, no profile doc yet
  confirmation: FirebaseAuthTypes.ConfirmationResult | null;
  setConfirmation: (c: FirebaseAuthTypes.ConfirmationResult | null) => void;
  signOut: () => Promise<void>;
  /** Re-run the boot fetches (profile/claim) after a network stall. */
  retryBootstrap: () => void;
  /** Pre-auth viewer: signs into the shared viewer account (fixed-code test
   *  number, no SMS) — REAL data, read-only (all writes blocked client-side). */
  enterViewer: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [caps, setCaps] = useState<Capabilities>(NO_CAPS);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [provisioned, setProvisioned] = useState(false);
  const [claimLoaded, setClaimLoaded] = useState(false);
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [bootRetry, setBootRetry] = useState(0);

  useEffect(() => {
    initAppCheck().catch((e) => console.warn('App Check init failed:', e));
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(false);
      setCaps(NO_CAPS);
      setProvisioned(false);
      setClaimLoaded(false);
      return;
    }
    const unsub = subscribeToProfile(
      user.uid,
      (p) => {
        setProfile(p);
        setProfileLoaded(true);
      },
      () => setProfileLoaded(true)
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bootRetry]);

  // Crews the user belongs to (drives the crew screens).
  useEffect(() => {
    if (!user) {
      setCrews([]);
      return;
    }
    const unsub = subscribeToMyCrews(user.uid, setCrews, () => {});
    return unsub;
  }, [user]);

  // Capabilities live in the ID-token custom claim. Force-refresh while a
  // profile exists but the claim has no caps yet, so a freshly provisioned user
  // picks them up without re-logging in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const force = !!profile && !provisioned;
    setClaimLoaded(false);
    const apply = (res: FirebaseAuthTypes.IdTokenResult) => {
      if (cancelled) return;
      const rawCaps = (res.claims as any).caps;
      setProvisioned(rawCaps != null);
      setCaps(toCaps(rawCaps));
      setClaimLoaded(true);
    };
    // A force refresh hits the network; on a stalled connection fall back to
    // the cached token (local) so boot never hangs on this gate.
    withTimeout(getIdTokenResult(user, force), 15000)
      .then(apply)
      .catch(() => {
        getIdTokenResult(user, false)
          .then(apply)
          .catch(() => {
            if (cancelled) return;
            setCaps(NO_CAPS);
            setProvisioned(false);
            setClaimLoaded(true);
          });
      });
    return () => {
      cancelled = true;
    };
  }, [user, profile, provisioned, bootRetry]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      caps,
      crews,
      provisioned,
      initializing,
      profileLoaded,
      claimLoaded,
      needsRegistration: !!user && profileLoaded && !profile,
      confirmation,
      setConfirmation,
      signOut: async () => {
        if (isViewerReadOnly()) {
          // Leave the read-only viewer: sign the shared account out fully.
          setViewerReadOnly(false);
          invalidateFinancialData();
          setConfirmation(null);
          await signOutUser();
          return;
        }
        setConfirmation(null);
        await signOutUser();
      },
      retryBootstrap: () => setBootRetry((n) => n + 1),
      enterViewer: async () => {
        // The viewer account is a Firebase TEST phone number: the fixed code
        // signs in with no SMS, the account is provisioned read-caps, and the
        // read-only flag blocks every mutating service call client-side.
        setViewerReadOnly(true);
        try {
          const conf = await sendOtp('+972500123456');
          await confirmOtp(conf, '000000');
          invalidateFinancialData();
        } catch (e) {
          setViewerReadOnly(false);
          throw e;
        }
      },
    }),
    [user, profile, caps, crews, provisioned, initializing, profileLoaded, claimLoaded, confirmation]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
