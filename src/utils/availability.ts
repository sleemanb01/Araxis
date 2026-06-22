/** Working-days + next-available-date helpers for provider scheduling. */

export const HE_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const HE_WEEKDAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

/** Sunday–Thursday, the default Israeli work week. */
export const DEFAULT_WORKING_DAYS = [0, 1, 2, 3, 4];

function key(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Earliest working day from today (inclusive) that has no job already scheduled,
 * within `horizon` days. Returns an ISO string, or null if none / no working days.
 */
export function nextAvailableDate(
  workingDays: number[],
  busyDates: (string | null | undefined)[],
  horizon = 60
): string | null {
  if (!workingDays || workingDays.length === 0) return null;
  const busy = new Set(
    busyDates.filter(Boolean).map((d) => key(new Date(d as string)))
  );
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  for (let i = 0; i < horizon; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (!workingDays.includes(d.getDay())) continue;
    if (!busy.has(key(d))) return d.toISOString();
  }
  return null;
}
