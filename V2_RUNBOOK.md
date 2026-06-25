# Araxis v2 — per-business setup & verification runbook

Internal field-service ops app with a role hierarchy (**admin > lead_tech >
junior_tech**). **One build + one Firebase project per business.** Distribute
**privately** (Apple Business Manager / managed Google Play) — not the public stores.

## 1. Firebase project (per business)
1. Create a Firebase project (e.g. `araxis-v2`, or `araxis-<business>`). Upgrade to **Blaze** (Cloud Functions need it).
2. Add an **Android app** (package = `ANDROID_PACKAGE`, default `com.araxis.ops`) and an **iOS app** (`IOS_BUNDLE_ID`, default `com.araxis.ops`). Download `google-services.json` + `GoogleService-Info.plist`.
3. Enable **Phone** auth. After the first build, add the keystore **SHA-1/SHA-256** (`eas credentials`) to the Android app and register **Play Integrity** for App Check.

## 2. Deploy the backend
```
firebase use <project>
firebase deploy --only firestore:rules,storage,functions   # Blaze required
```

## 3. Bootstrap the first admin
Custom claims can't be set from the console, so once the admin has signed in (their auth uid exists):
```
# Project settings → Service accounts → Generate key → functions/service-account.json (gitignored)
cd functions
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/set-admin.js <uid> <teamId>
```
The admin signs out/in (or the app force-refreshes the token) to pick up the `admin` claim.

## 4. White-label build (EAS)
Per-business env (EAS env vars / file secrets):
`BUSINESS_NAME`, `APP_SLUG`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE`, `THEME_COLOR`, `EAS_PROJECT_ID`,
`GOOGLE_SERVICES_JSON` (file), `GOOGLE_SERVICES_PLIST` (file).
```
eas build -p android --profile production
eas build -p ios --profile production
```
Distribute privately. (`eas.json` submit track is `internal`.)

## 5. Verification (per role)
- **Admin** — provisions crew (Profile → *ניהול צוות*), creates calls (Dashboard → *+ קריאה חדשה*), edits financials; sees **all** calls + price/profit.
- **Lead tech** — sees only calls they lead; team payout splits; manages inventory + warehouse↔car transfers.
- **Junior tech** — sees only calls they assist on; **only their own payout**; no client price.
- **Security wall** — confirm (Firestore rules / emulator) a junior cannot read another team's call or any `privateData/financials`. Suggested: `@firebase/rules-unit-testing` + `firebase emulators:exec` in CI.

## Onboarding model
A new user signs in → enters their name (self-registers a *pending* profile, no role claim) → an admin assigns a role + team in the Crew screen (`setUserRole` Cloud Function sets the custom claim). No public sign-up.
