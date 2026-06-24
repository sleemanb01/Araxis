import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { subscribeToAuth, signOutUser } from '../services/authService';
import { subscribeToProfile } from '../services/userService';
import { initAppCheck } from '../services/appCheck';
import { UserProfile, UserRole } from '../types/user';

interface UserContextValue {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null; // Firestore doc — name/team/role-display
  role: UserRole | null; // AUTHORITATIVE role from the custom claim
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
  const [claimRole, setClaimRole] = useState<UserRole | null>(null);
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
      setClaimRole(null);
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

  // Authoritative role lives in the ID-token custom claim. Force-refresh while a
  // profile exists but no claim is present yet, so a user picks up their claim
  // right after an admin provisions them (no re-login needed).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const force = !!profile && claimRole === null;
    setClaimLoaded(false);
    user
      .getIdTokenResult(force)
      .then((res) => {
        if (cancelled) return;
        setClaimRole((res.claims.role as UserRole) ?? null);
        setClaimLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setClaimRole(null);
        setClaimLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, profile, claimRole]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      role: claimRole,
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
    [user, profile, claimRole, initializing, profileLoaded, claimLoaded, confirmation]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
