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

/**
 * Normalize a phone number to E.164 (Israel, +972). Accepts the common ways a
 * user might type it — most don't know the +972 prefix:
 *   0501234567      -> +972501234567   (local, leading 0)
 *   972501234567    -> +972501234567   (country code, no +)
 *   00972501234567  -> +972501234567   (intl. dialing prefix)
 *   +972501234567   -> +972501234567   (already E.164)
 *   501234567       -> +972501234567   (bare subscriber number)
 */
export function toE164(input: string): string {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits; // already E.164
  if (digits.startsWith('00')) digits = digits.slice(2); // intl. prefix -> country code
  if (digits.startsWith('972')) return '+' + digits; // country code without +
  if (digits.startsWith('0')) return '+972' + digits.slice(1); // local leading 0
  return '+972' + digits; // bare subscriber number
}

export async function sendOtp(
  phone: string
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  const e164 = toE164(phone);
  // Use real app verification (reCAPTCHA via the REVERSED_CLIENT_ID URL scheme,
  // or APNs silent push). Do NOT set appVerificationDisabledForTesting — with a
  // non-whitelisted number it makes the request omit the verification token and
  // the server rejects it with "does not contain a client identifier".
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
