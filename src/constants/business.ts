import Constants from 'expo-constants';

// Per-business white-label values, injected at build time via app.config.js
// `extra` (driven by the BUSINESS_NAME env var).
const extra = (Constants.expoConfig?.extra ?? {}) as {
  businessName?: string;
};

export const BUSINESS_NAME: string = extra.businessName ?? 'Araxis';
