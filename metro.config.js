const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Expo's default ships inlineRequires: false — every imported module runs at
// cold start. Inline requires defer each module's initialization to its first
// actual use, cutting time-to-interactive (screens, modals and their deps
// initialize when opened, not at boot).
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
  },
});

module.exports = config;
