# Phone auth (SMS OTP) — release build checklist

Phone sign-in behaves **completely differently in development and in a release
build** (TestFlight / App Store / Play):

| | Development | Release (TestFlight, App Store, Play) |
|---|---|---|
| App verification | Skipped — `appVerificationDisabledForTesting = true` | Enforced |
| App Check provider | `debug` | App Attest (iOS) / Play Integrity (Android) |
| Numbers that work | Only test numbers from the Firebase console | Real numbers, real SMS |

Because development skips verification entirely, **a phone-auth regression can
only ever show up in a release build**. "It works on my dev client" says nothing
about TestFlight.

Some of what follows is code (already in the repo); the rest is Firebase / Apple
console configuration that the app binary cannot supply on its own. Phone auth
fails if *any* item is missing.

---

## iOS

Firebase verifies the app before sending an SMS, using two mechanisms in order:

1. **Silent APNs push** — the preferred path.
2. **reCAPTCHA in SFSafariViewController** — the fallback when the silent push
   does not arrive.

### 1. Silent APNs push

- **APNs authentication key uploaded to Firebase.**
  Firebase Console → Project settings → Cloud Messaging → *Apple app
  configuration* → upload the `.p8` APNs key (with its Key ID and your Team ID,
  `89F5K29LBN`). A key works for both the sandbox and production APNs
  environments.
  *Without this, no silent push is ever sent and every verification falls
  through to reCAPTCHA.*
- **Push Notifications capability enabled** on the App ID
  (`com.sleemanb01.araxis`) in the Apple Developer portal, and present in the
  provisioning profile EAS builds with. If the capability was added after the
  profile was created, the profile must be regenerated — `eas credentials`.
- **Entitlement and background mode** — in `app.config.js`:
  `ios.entitlements['aps-environment'] = 'production'` and
  `ios.infoPlist.UIBackgroundModes = ['remote-notification']`.
  `production` is correct for TestFlight: TestFlight builds use the production
  APNs environment, not the sandbox.

### 2. reCAPTCHA fallback — the custom URL scheme

The fallback opens a web page and returns to the app through a custom URL
scheme equal to `REVERSED_CLIENT_ID` in `GoogleService-Info.plist`. If that
scheme is not in `CFBundleURLTypes`, FirebaseAuth raises

> Please register custom URL scheme `com.googleusercontent.apps.…` in the app's
> Info.plist file

and sign-in fails for **every** user whose silent push did not arrive.

`GoogleService-Info.plist` is not committed (EAS injects it via the
`GOOGLE_SERVICES_PLIST` file environment variable), so the scheme cannot be
hardcoded in `app.config.js`. The config plugin
[`plugins/withFirebasePhoneAuth.js`](plugins/withFirebasePhoneAuth.js) reads the
plist at prebuild time and injects the scheme.

The plist only contains `REVERSED_CLIENT_ID` if the iOS app has an **OAuth
client**. If the plugin warns that the key is missing, re-download
`GoogleService-Info.plist` from the Firebase console after the OAuth client
exists, and update the `GOOGLE_SERVICES_PLIST` EAS environment variable.

To confirm the scheme made it into a build:

```sh
npx expo prebuild --platform ios --clean
plutil -p ios/Mima/Info.plist | grep -A4 CFBundleURLTypes
```

### 3. App Check

`src/services/appCheck.ts` uses App Attest in release builds. If App Check is
**enforced** for Firebase Authentication (Firebase Console → App Check → APIs),
then:

- the iOS app must be registered under App Check with the App Attest provider;
- sign-in must not run before attestation completes — `sendOtp()` awaits
  `appCheckReady()` for exactly this reason.

Enforcing App Check on Authentication while the app is not registered rejects
every sign-in with `auth/firebase-app-check-token-is-invalid`. If in doubt, set
Authentication to *Unenforced* (monitoring only) and confirm real traffic shows
up as verified before enforcing.

---

## Android

- **SHA-1 and SHA-256 fingerprints** of the signing key registered in Firebase
  Console → Project settings → Your apps → Android app. For Play-signed builds
  this is the **Play App Signing** certificate from the Play Console, not just
  the upload key. Get the EAS keystore fingerprints with
  `eas credentials -p android`.
  Missing or stale fingerprints break Play Integrity verification and phone auth
  fails with `auth/app-not-authorized`.
- `google-services.json` re-downloaded after adding fingerprints, and the
  `GOOGLE_SERVICES_JSON` EAS environment variable updated.

---

## Both platforms

- **Phone provider enabled** — Firebase Console → Authentication → Sign-in
  method → Phone.
- **Identity Toolkit API not restricted** in a way that excludes the app
  (Google Cloud Console → APIs & Services → Credentials → the iOS/Android API
  key from the config file).
- **SMS region policy** allows Israel — Firebase Console → Authentication →
  Settings → SMS region policy. A default deny-list configuration silently
  blocks `+972`.
- **SMS quota** not exhausted — the Spark (free) plan has a low daily cap, and
  exceeding it returns `auth/quota-exceeded`.

---

## Diagnosing a failure from the field

The auth screens now append the Firebase error code to the message shown to the
user (`describeAuthError` in `src/services/authService.ts`), so a tester can
report it. What each code means:

| Code | Cause |
|---|---|
| `auth/missing-client-identifier` | No APNs token *and* no usable reCAPTCHA fallback — the URL scheme is missing, or there is no OAuth client. |
| `auth/invalid-app-credential` | APNs token rejected — wrong APNs environment, or the key in Firebase does not match the app. |
| `auth/app-not-authorized` | App not authorized for this Firebase project — Android SHA fingerprints, or an API-key restriction. |
| `auth/firebase-app-check-token-is-invalid` | App Check is enforced and attestation failed or had not completed. |
| `auth/quota-exceeded` | SMS quota exhausted for the project. |
| `auth/too-many-requests` | Rate-limited — usually abuse protection on the number or device. |
| `auth/network-request-failed` | Device connectivity. |

For a build in hand, the device console (Xcode → Window → Devices and Simulators
→ View Device Logs, or Console.app with the device attached) carries the full
`[sendOtp] failed:` warning plus FirebaseAuth's own logging.
