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
 */

import { firebase } from '@react-native-firebase/app-check';

let initialized = false;

export async function initAppCheck(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const provider = firebase.appCheck().newReactNativeFirebaseAppCheckProvider();

  provider.configure({
    android: {
      provider: __DEV__ ? 'debug' : 'playIntegrity',
    },
    apple: {
      provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
    },
  });

  await firebase.appCheck().initializeAppCheck({
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}
