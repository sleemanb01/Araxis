// Dynamic Expo config — white-label per business via env vars (one build +
// Firebase project per business). Firebase native config files come from EAS
// file environment variables in the cloud, with local fallbacks:
//   GOOGLE_SERVICES_PLIST -> ./GoogleService-Info.plist  (iOS)
//   GOOGLE_SERVICES_JSON  -> ./google-services.json      (Android)

const BUSINESS_NAME   = process.env.BUSINESS_NAME   ?? 'Araxis';
const APP_SLUG        = process.env.APP_SLUG        ?? 'araxis';
const IOS_BUNDLE_ID   = process.env.IOS_BUNDLE_ID   ?? 'com.araxis.ops';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.araxis.ops';
const THEME_COLOR     = process.env.THEME_COLOR     ?? '#2563EB';
const EAS_PROJECT_ID  = process.env.EAS_PROJECT_ID  ?? '3bf93c35-fac2-48d2-b256-509233b71429';
// Firebase phone-auth reCAPTCHA fallback needs the iOS OAuth reversed client id
// as a URL scheme. Per-business override via IOS_REVERSED_CLIENT_ID.
const IOS_REVERSED_CLIENT_ID = process.env.IOS_REVERSED_CLIENT_ID
  ?? 'com.googleusercontent.apps.551304434332-ft92apu5jvir0ha175141rkpqhmc7s5g';

module.exports = () => ({
  expo: {
    name: BUSINESS_NAME,
    slug: APP_SLUG,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: IOS_BUNDLE_ID,
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
      // APNs entitlement + background mode are required for Firebase phone auth
      // to verify the app via silent push on real devices (production).
      entitlements: {
        'aps-environment': 'production',
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
        CFBundleURLTypes: [{ CFBundleURLSchemes: [IOS_REVERSED_CLIENT_ID] }],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      package: ANDROID_PACKAGE,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/auth',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            forceStaticLinking: [
              'RNFBApp',
              'RNFBAuth',
              'RNFBAppCheck',
              'RNFBFirestore',
              'RNFBFunctions',
            ],
          },
        },
      ],
      '@react-native-firebase/app-check',
      [
        'expo-camera',
        {
          cameraPermission: 'הרשאת המצלמה משמשת לסריקת ברקודים של פריטי מלאי.',
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'המיקום משמש למילוי כתובת קריאת השירות.',
        },
      ],
    ],
    extra: {
      businessName: BUSINESS_NAME,
      themeColor: THEME_COLOR,
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
    owner: 'sleemanb01',
  },
});
