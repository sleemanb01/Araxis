// Dynamic Expo config.
// Reads the Firebase native config file paths from EAS file environment
// variables when building in the cloud, falling back to local files for
// `expo start` / local prebuilds.
//
// EAS file env vars (create with `eas env:create --type file`):
//   GOOGLE_SERVICES_PLIST -> ./GoogleService-Info.plist  (iOS)
//   GOOGLE_SERVICES_JSON  -> ./google-services.json      (Android)

const appJson = require('./app.json');

module.exports = () => {
  const expo = appJson.expo;

  return {
    ...expo,
    ios: {
      ...expo.ios,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST ?? expo.ios.googleServicesFile,
    },
    android: {
      ...expo.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? expo.android.googleServicesFile,
    },
  };
};
