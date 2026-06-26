import Constants from 'expo-constants';

// Per-business white-label values, injected at build time via app.config.js
// `extra` (driven by BUSINESS_NAME / THEME_COLOR env vars).
const extra = (Constants.expoConfig?.extra ?? {}) as {
  businessName?: string;
  themeColor?: string;
};

export const BUSINESS_NAME: string = extra.businessName ?? 'Araxis';
export const THEME_COLOR: string = extra.themeColor ?? '#2563EB';
