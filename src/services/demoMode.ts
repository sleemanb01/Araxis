/**
 * Read-only viewer: signed in as the shared viewer account, sees the REAL
 * Firebase data live, but every mutating service call is blocked client-side.
 * Kept in its own tiny module so services can import it without cycles.
 */
let viewerReadOnly = false;

export const isViewerReadOnly = (): boolean => viewerReadOnly;
export const setViewerReadOnly = (v: boolean): void => {
  viewerReadOnly = v;
};

/** Throw inside mutating service calls when the read-only viewer is active. */
export function assertWritable(): void {
  if (viewerReadOnly) throw new Error('מצב צפייה — לקריאה בלבד.');
}

/**
 * UI-side viewer guard: when the read-only viewer is active, show the notice
 * and return true (caller bails). ONE implementation for every dead button.
 */
export function viewerBlocked(message = 'הפעולה מושבתת במצב צפייה.'): boolean {
  if (!viewerReadOnly) return false;
  // Lazy require keeps this module import-safe outside React Native contexts
  // (the unit tests import sibling utils through pure module graphs).
  const { Alert } = require('react-native');
  Alert.alert('מצב צפייה', message);
  return true;
}
