import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getIdTokenResult } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { subscribeToAuth, signOutUser } from '../services/authService';
import { subscribeToProfile } from '../services/userService';
import { subscribeToMyCrews } from '../services/crewService';
import { initAppCheck } from '../services/appCheck';
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
  }, [user]);

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
    getIdTokenResult(user, force)
      .then((res) => {
        if (cancelled) return;
        const rawCaps = (res.claims as any).caps;
        setProvisioned(rawCaps != null);
        setCaps(toCaps(rawCaps));
        setClaimLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCaps(NO_CAPS);
        setProvisioned(false);
        setClaimLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, profile, provisioned]);

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
        setConfirmation(null);
        await signOutUser();
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
