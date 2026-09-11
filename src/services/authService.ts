/**
 * Auth service — phone (SMS OTP) authentication via React Native Firebase.
 *
 * Flow:
 *   1. sendOtp(phone)         -> sends SMS, returns a confirmation handle
 *   2. confirmOtp(conf, code) -> verifies the code, signs the user in
 *   3. signOutUser()          -> signs out
 *
 * Phone numbers MUST be in E.164 format, e.g. "+972501234567".
 *
 * iOS release builds (TestFlight / App Store) verify the app before Firebase
 * will send an SMS: a silent APNs push first, then a reCAPTCHA web flow as a
 * fallback. Both are bypassed in development via
 * `appVerificationDisabledForTesting`, so this path is only ever exercised in a
 * release build — see PHONE_AUTH_SETUP.md for the project-side setup that
 * the app binary cannot supply on its own.
 */

import {
  getAuth,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged,
  type FirebaseAuthTypes,
} from '@react-native-firebase/auth';
import { appCheckReady } from './appCheck';

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
  } else {
    // Release builds must go through real app verification. Set this
    // explicitly so a stale value can never leak the testing bypass into a
    // shipped build.
    auth.settings.appVerificationDisabledForTesting = false;

    // If App Check is enforced for Firebase Authentication, sending the SMS
    // before attestation finishes fails with
    // `auth/firebase-app-check-token-is-invalid`. On a cold start the user can
    // reach this screen within a second or two, so wait for the token.
    await appCheckReady();
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

/**
 * Human-readable (Hebrew) message for a Firebase auth failure.
 *
 * The device-verification codes below are unreachable in development — they
 * only appear in release builds — so the raw code is appended to the fallback
 * message. Without it a TestFlight tester can only report "it didn't work",
 * which is not enough to tell an APNs problem from an App Check one.
 */
export function describeAuthError(e: any, fallback: string): string {
  const code: string | undefined = e?.code;

  switch (code) {
    // ---- User-correctable ----
    case 'auth/invalid-phone-number':
      return 'מספר טלפון לא תקין.';
    case 'auth/missing-phone-number':
      return 'לא הוזן מספר טלפון.';
    case 'auth/invalid-verification-code':
      return 'קוד אימות שגוי.';
    case 'auth/code-expired':
      return 'הקוד פג תוקף. שלח קוד חדש.';
    case 'auth/session-expired':
      return 'פג תוקף ההפעלה. שלח קוד חדש.';
    case 'auth/too-many-requests':
      return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
    case 'auth/network-request-failed':
      return 'בעיית רשת. בדוק את החיבור לאינטרנט.';
    case 'auth/quota-exceeded':
      return 'מכסת הודעות ה-SMS נוצלה. נסה שוב מאוחר יותר.';

    // ---- Device / app verification (release builds only) ----
    // The app could not prove to Firebase that it is genuine, so no SMS was
    // sent. Nothing the user can do — surface a distinct message so these are
    // not mistaken for a wrong phone number.
    case 'auth/missing-client-identifier':
    case 'auth/invalid-app-credential':
    case 'auth/app-not-authorized':
    case 'auth/missing-app-credential':
    case 'auth/firebase-app-check-token-is-invalid':
      return `אימות האפליקציה נכשל, לכן לא נשלחה הודעה. נסה שוב או פנה לתמיכה (${code}).`;

    default:
      return code ? `${fallback} (${code})` : fallback;
  }
}
