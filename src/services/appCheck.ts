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
 *
 * If App Check is *enforced* for Firebase Authentication, a sign-in attempt that
 * runs before attestation completes is rejected with
 * `auth/firebase-app-check-token-is-invalid`. Callers that are about to hit an
 * enforced endpoint should therefore await `appCheckReady()` first.
 */

import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck } from '@react-native-firebase/app-check';

// The provider class is exported as a runtime value but typed as type-only at
// the package root (RN Firebase re-export quirk), so require it for the ctor.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ReactNativeFirebaseAppCheckProvider } = require('@react-native-firebase/app-check');

let initPromise: Promise<void> | null = null;

export function initAppCheck(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
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
  })();

  // A failed attestation must not poison the cached promise — the next caller
  // (e.g. a retry after the device regains connectivity) should try again.
  initPromise.catch(() => {
    initPromise = null;
  });

  return initPromise;
}

/**
 * Resolve once App Check has attested this binary.
 *
 * Never rejects: App Check may legitimately be unavailable (offline, or not
 * enforced for this project) and that must not block the sign-in attempt —
 * the backend is the authority on whether a token was required.
 */
export async function appCheckReady(): Promise<void> {
  try {
    await initAppCheck();
  } catch (e) {
    console.warn('App Check attestation unavailable:', e);
  }
}
