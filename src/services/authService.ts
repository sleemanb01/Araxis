/**
 * Auth service — phone (SMS OTP) authentication via React Native Firebase.
 *
 * Flow:
 *   1. sendOtp(phone)         -> sends SMS, returns a confirmation handle
 *   2. confirmOtp(conf, code) -> verifies the code, signs the user in
 *   3. signOutUser()          -> signs out
 *
 * Phone numbers MUST be in E.164 format, e.g. "+972501234567".
 */

import {
  getAuth,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';

const auth = getAuth();

/** Normalize an Israeli local number (05X-XXXXXXX) to E.164 (+9725XXXXXXXX). */
export function toE164(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return '+972' + digits.slice(1);
  return '+972' + digits;
}

export async function sendOtp(
  phone: string
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  const e164 = toE164(phone);
  if (__DEV__) {
    // Skip iOS app verification (APNs/reCAPTCHA) in development so test
    // numbers registered in the Firebase Console work on-device without an
    // APNs key. MUST stay dev-only — real numbers in production require
    // proper APNs configuration.
    auth.settings.appVerificationDisabledForTesting = true;
  }
  return signInWithPhoneNumber(auth, e164);
}

export async function confirmOtp(
  confirmation: FirebaseAuthTypes.ConfirmationResult,
  code: string
): Promise<FirebaseAuthTypes.User> {
  const credential = await confirmation.confirm(code);
  if (!credential?.user) {
    throw new Error('Verification failed — no user returned.');
  }
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  return signOut(auth);
}

export function subscribeToAuth(
  callback: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): FirebaseAuthTypes.User | null {
  return auth.currentUser;
}

/** Force-refresh the ID token (use before privileged backend calls). */
export async function getFreshIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}
