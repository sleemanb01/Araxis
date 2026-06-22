/**
 * Tiny bridge so the full-calendar screen can return a picked date to its caller
 * without passing a (non-serializable) callback through navigation params.
 */
let pending: ((iso: string) => void) | null = null;

export function setPendingDatePick(cb: (iso: string) => void): void {
  pending = cb;
}

export function takePendingDatePick(): ((iso: string) => void) | null {
  return pending;
}

export function clearPendingDatePick(): void {
  pending = null;
}
