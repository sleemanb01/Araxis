import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getIdTokenResult } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { subscribeToAuth, signOutUser, getCurrentUser } from '../services/authService';
import { subscribeToProfile } from '../services/userService';
import { subscribeToMyCrews } from '../services/crewService';
import { initAppCheck } from '../services/appCheck';
import { Alert } from 'react-native';
import { isDemo, setDemoMode } from '../services/demoMode';
import { DEMO_UID, clearDemo } from '../services/demoStore';
import { hydrateDemoFromReal } from '../services/demoSeed';
import { invalidateFinancialData } from '../hooks/useFinancialData';
import { withTimeout } from '../utils/promise';
import { UserProfile, Capabilities, NO_CAPS, ALL_CAPS, toCaps } from '../types/user';
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
  /** Enter viewer/demo mode — real data snapshot when signed in (sample data
   *  otherwise); every change stays in memory, nothing touches the DB. */
  enterDemo: () => Promise<void>;
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
    if (isDemo()) {
      // Viewer mode: full capabilities, no token round-trip.
      setCaps(ALL_CAPS);
      setProvisioned(true);
      setClaimLoaded(true);
      return;
    }
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
        if (isDemo()) {
          // Leave the sandbox: back to the real (still signed-in) auth state.
          setDemoMode(false);
          invalidateFinancialData();
          setUser(getCurrentUser());
          return;
        }
        setConfirmation(null);
        await signOutUser();
      },
      retryBootstrap: () => setBootRetry((n) => n + 1),
      enterDemo: async () => {
        // Signed-in owner: snapshot the REAL Firestore data into the sandbox —
        // real numbers, writes stay local (visible error if it fails; never
        // fake data). Unauthenticated (login screen): rules forbid reads, so
        // the sandbox starts EMPTY and the viewer builds their own content.
        if (user && provisioned) {
          try {
            await hydrateDemoFromReal(crews);
          } catch {
            Alert.alert('שגיאה', 'טעינת הנתונים למצב צפייה נכשלה. נסה שוב.');
            return;
          }
        } else {
          clearDemo();
        }
        setDemoMode(true);
        invalidateFinancialData();
        setUser({ uid: DEMO_UID } as any); // fake auth user drives the existing effects
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
