// Dynamic Expo config (single source of truth — no app.json).
//
// Firebase native config file paths are read from EAS file environment
// variables when building in the cloud, with local fallbacks for
// `expo start` / local prebuilds:
//   GOOGLE_SERVICES_PLIST -> ./GoogleService-Info.plist  (iOS)
//   GOOGLE_SERVICES_JSON  -> ./google-services.json      (Android)

module.exports = () => ({
  expo: {
    name: 'Mima',
    slug: 'araxis',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.sleemanb01.araxis',
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST ?? './GoogleService-Info.plist',
      // APNs entitlement + background mode are required for Firebase phone auth
      // to verify the app via silent push on real devices (production).
      entitlements: {
        'aps-environment': 'production',
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
      package: 'com.sleemanb01.araxis',
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
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
              'RNFBStorage',
            ],
          },
        },
      ],
      '@react-native-firebase/app-check',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Araxis needs access to your photos so you can set a business logo.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '3bf93c35-fac2-48d2-b256-509233b71429',
      },
    },
    owner: 'sleemanb01',
  },
});
