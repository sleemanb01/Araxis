/**
 * Reject after `ms` so a stalled network call can never hang the UI forever
 * (a silent, spinner-only hang reads as "app not responding").
 */
export function withTimeout<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      const e: any = new Error('Operation timed out.');
      e.code = 'auth/timeout';
      reject(e);
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}
