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
