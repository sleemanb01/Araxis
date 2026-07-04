/**
 * Viewer/demo mode flag. When ON, every data service reads and writes the
 * in-memory demoStore instead of Firestore — the viewer can use the whole app
 * (jobs, numbers, warehouse) without touching the real database.
 * Kept in its own tiny module so services can import it without cycles.
 */
let demo = false;

export const isDemo = (): boolean => demo;
export const setDemoMode = (v: boolean): void => {
  demo = v;
};
