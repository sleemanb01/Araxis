import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { UserProfile } from '../types/user';

interface AuthStore {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;            // true until first auth state callback fires
  confirmation: FirebaseAuthTypes.ConfirmationResult | null; // transient, OTP step

  profile: UserProfile | null;      // Firestore user profile (null = not registered)
  profileLoaded: boolean;           // true once we've checked Firestore for a profile

  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setInitializing: (v: boolean) => void;
  setConfirmation: (c: FirebaseAuthTypes.ConfirmationResult | null) => void;
  setProfile: (p: UserProfile | null) => void;
  setProfileLoaded: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  initializing: true,
  confirmation: null,
  profile: null,
  profileLoaded: false,

  setUser: (user) => set({ user }),
  setInitializing: (initializing) => set({ initializing }),
  setConfirmation: (confirmation) => set({ confirmation }),
  setProfile: (profile) => set({ profile }),
  setProfileLoaded: (profileLoaded) => set({ profileLoaded }),
}));
