import { create } from 'zustand';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthStore {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;            // true until first auth state callback fires
  confirmation: FirebaseAuthTypes.ConfirmationResult | null; // transient, OTP step

  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setInitializing: (v: boolean) => void;
  setConfirmation: (c: FirebaseAuthTypes.ConfirmationResult | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  initializing: true,
  confirmation: null,

  setUser: (user) => set({ user }),
  setInitializing: (initializing) => set({ initializing }),
  setConfirmation: (confirmation) => set({ confirmation }),
}));
