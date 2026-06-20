/**
 * Firebase App Check — attests that requests come from your genuine app binary,
 * blocking abuse from scripts, emulators, and tampered clients.
 *
 *   - iOS production:  App Attest (with DeviceCheck fallback)
 *   - Android production: Play Integrity
 *   - Development:     debug provider (prints a debug token to the console;
 *                      register it in Firebase Console → App Check → Apps → Manage debug tokens)
 *
 * Call initAppCheck() ONCE, as early as possible (before any Firestore/Auth calls).
 * Uses the modular RN Firebase API (v22+).
 */

import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck } from '@react-native-firebase/app-check';

// The provider class is exported as a runtime value but typed as type-only at
// the package root (RN Firebase re-export quirk), so require it for the ctor.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReactNativeFirebaseAppCheckProvider } = require('@react-native-firebase/app-check');

let initialized = false;

export async function initAppCheck(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const provider = new ReactNativeFirebaseAppCheckProvider();

  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
  });

  await initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}
