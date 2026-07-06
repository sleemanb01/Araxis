/**
 * Working days in the CURRENT month: dates whose weekday is in `days`
 * (0=Sun…6=Sat). Without availability, defaults to Sun–Fri (Israeli week).
 */
export function workDaysInMonth(days?: number[]): number {
  const work = new Set(days && days.length ? days : [0, 1, 2, 3, 4, 5]);
  const now = new Date();
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let n = 0;
  for (let d = 1; d <= total; d++) {
    if (work.has(new Date(now.getFullYear(), now.getMonth(), d).getDay())) n++;
  }
  return Math.max(1, n);
}

/**
 * Working days REMAINING in the current month, from today inclusive.
 * Same weekday convention as workDaysInMonth; never below 1.
 */
export function workDaysLeftInMonth(days?: number[]): number {
  const work = new Set(days && days.length ? days : [0, 1, 2, 3, 4, 5]);
  const now = new Date();
  const total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let n = 0;
  for (let d = now.getDate(); d <= total; d++) {
    if (work.has(new Date(now.getFullYear(), now.getMonth(), d).getDay())) n++;
  }
  return Math.max(1, n);
}

/** Format a month key ("YYYY-MM") as a Hebrew month, e.g. "יוני 2026". */
export function formatMonthLabel(month: string): string {
  return new Date(month + '-01T00:00:00').toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric',
  });
}
