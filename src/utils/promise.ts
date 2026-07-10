/**
 * Reject after `ms` so a stalled network call can never hang the UI forever
 * (a silent, spinner-only hang reads as "app not responding").
 */
/**
 * Await a Firestore WRITE with the offline contract: local persistence echoes
 * the write instantly and syncs it later, so a slow or dead network is NOT a
 * failure — after `ms` the pending write is treated as queued and the flow
 * continues normally. Real rejections (rules, validation) still throw.
 */
export function awaitWrite(p: Promise<unknown>, ms = 6000): Promise<'ok' | 'queued'> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve('queued'), ms);
    p.then(
      () => {
        clearTimeout(t);
        resolve('ok');
      },
      (err) => {
        clearTimeout(t);
        reject(err);
      }
    );
  });
}

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
