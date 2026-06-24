import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { subscribeToAuth, signOutUser } from '../services/authService';
import { subscribeToProfile } from '../services/userService';
import { initAppCheck } from '../services/appCheck';
import { UserProfile, UserRole } from '../types/user';

interface UserContextValue {
  user: FirebaseAuthTypes.User | null;
  profile: UserProfile | null;
  role: UserRole | null; // from the profile doc; drives the UI
  initializing: boolean; // true until the first auth callback
  profileLoaded: boolean; // true once Firestore has been checked for a profile
  confirmation: FirebaseAuthTypes.ConfirmationResult | null; // transient OTP handle
  setConfirmation: (c: FirebaseAuthTypes.ConfirmationResult | null) => void;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const refreshedForRole = useRef<string | null>(null);

  // Auth state.
  useEffect(() => {
    initAppCheck().catch((e) => console.warn('App Check init failed:', e));
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setInitializing(false);
    });
    return unsub;
  }, []);

  // Profile doc while signed in.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileLoaded(false);
      refreshedForRole.current = null;
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

  // When a role first appears, force-refresh the ID token so the custom claim
  // (set by the setUserRole Cloud Function) is present for Firestore rules.
  useEffect(() => {
    if (user && profile?.role && refreshedForRole.current !== profile.role) {
      refreshedForRole.current = profile.role;
      user.getIdToken(true).catch(() => {});
    }
  }, [user, profile?.role]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      profile,
      role: profile?.role ?? null,
      initializing,
      profileLoaded,
      confirmation,
      setConfirmation,
      signOut: async () => {
        setConfirmation(null);
        await signOutUser();
      },
    }),
    [user, profile, initializing, profileLoaded, confirmation]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a UserProvider');
  return ctx;
}
