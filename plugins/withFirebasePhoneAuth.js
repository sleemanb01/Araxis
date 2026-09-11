/**
 * Expo config plugin — iOS requirements for Firebase phone (SMS) authentication.
 *
 * On a real device Firebase verifies the app before sending an SMS. It tries a
 * silent APNs push first; when that is unavailable (no APNs key on the Firebase
 * project, push entitlement missing, notification delivery blocked) it falls back
 * to a reCAPTCHA flow opened in SFSafariViewController.
 *
 * That fallback hands control back to the app through a custom URL scheme equal
 * to REVERSED_CLIENT_ID from GoogleService-Info.plist. If the scheme is not
 * registered in Info.plist, FirebaseAuth raises
 * "Please register custom URL scheme ... in the app's Info.plist file" and
 * sign-in fails for every user.
 *
 * This never surfaces in development because `appVerificationDisabledForTesting`
 * skips verification entirely there — it only appears in release builds
 * (TestFlight / App Store).
 *
 * GoogleService-Info.plist is not committed (it is injected by EAS as a file
 * environment variable), so the scheme cannot be hardcoded in app.config.js.
 * This plugin reads the plist at prebuild time and injects the scheme.
 */

const fs = require('fs');
const path = require('path');
const { withInfoPlist } = require('@expo/config-plugins');

/** Pull a top-level string entry out of an XML plist without a parser dependency. */
function readPlistString(contents, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = contents.match(
    new RegExp(`<key>${escaped}</key>\\s*<string>([^<]*)</string>`)
  );
  return match ? match[1].trim() : null;
}

/** REVERSED_CLIENT_ID, falling back to reversing CLIENT_ID when absent. */
function getReversedClientId(plistPath) {
  const contents = fs.readFileSync(plistPath, 'utf8');

  const reversed = readPlistString(contents, 'REVERSED_CLIENT_ID');
  if (reversed) return reversed;

  // Older plists only carry CLIENT_ID ("<id>.apps.googleusercontent.com").
  const clientId = readPlistString(contents, 'CLIENT_ID');
  if (!clientId) return null;
  return clientId.split('.').reverse().join('.');
}

function resolvePlistPath(config, projectRoot) {
  const candidate =
    process.env.GOOGLE_SERVICES_PLIST ??
    config.ios?.googleServicesFile ??
    './GoogleService-Info.plist';
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(projectRoot, candidate);
}

const withFirebasePhoneAuth = (config) =>
  withInfoPlist(config, (cfg) => {
    const plistPath = resolvePlistPath(cfg, cfg.modRequest.projectRoot);

    const schemes = [];

    if (fs.existsSync(plistPath)) {
      const reversedClientId = getReversedClientId(plistPath);
      if (reversedClientId) {
        schemes.push(reversedClientId);
      } else {
        console.warn(
          '[withFirebasePhoneAuth] No REVERSED_CLIENT_ID/CLIENT_ID in ' +
            `${plistPath}. Enable an OAuth client for the iOS app in the ` +
            'Firebase console, then re-download GoogleService-Info.plist — ' +
            'without it the reCAPTCHA fallback for phone auth cannot run.'
        );
      }
    } else {
      console.warn(
        `[withFirebasePhoneAuth] GoogleService-Info.plist not found at ${plistPath}; ` +
          'skipping the phone-auth URL scheme. The release build will fail to ' +
          'verify phone numbers if silent push verification is unavailable.'
      );
    }

    // Firebase also opens some verification callbacks on the bundle-id scheme.
    const bundleId = cfg.ios?.bundleIdentifier;
    if (bundleId) schemes.push(bundleId);

    if (schemes.length === 0) return cfg;

    const urlTypes = cfg.modResults.CFBundleURLTypes ?? [];
    const existing = new Set(
      urlTypes.flatMap((entry) => entry.CFBundleURLSchemes ?? [])
    );

    for (const scheme of schemes) {
      if (existing.has(scheme)) continue;
      existing.add(scheme);
      urlTypes.push({
        CFBundleURLName: scheme,
        CFBundleURLSchemes: [scheme],
      });
    }

    cfg.modResults.CFBundleURLTypes = urlTypes;
    return cfg;
  });

module.exports = withFirebasePhoneAuth;
