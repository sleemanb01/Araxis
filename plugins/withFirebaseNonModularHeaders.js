/**
 * Expo config plugin — fixes the iOS build error:
 *   "include of non-modular header inside framework module 'RNFBApp...'"
 *
 * Caused by React Native Firebase + `useFrameworks: "static"` on Expo SDK 54,
 * where Xcode treats the non-modular include warning as an error (-Werror).
 *
 * This patches the generated Podfile's post_install hook to set
 * CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES on every target.
 *
 * Ref: https://github.com/expo/expo/issues/39607
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';

const INJECT = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
`;

module.exports = function withFirebaseNonModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile'
      );
      let contents = fs.readFileSync(podfilePath, 'utf-8');

      if (!contents.includes(MARKER)) {
        contents = contents.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|\n${INJECT}`
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};
