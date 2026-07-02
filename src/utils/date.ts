/** Format a month key ("YYYY-MM") as a Hebrew month, e.g. "יוני 2026". */
export function formatMonthLabel(month: string): string {
  return new Date(month + '-01T00:00:00').toLocaleDateString('he-IL', {
    month: 'long',
    year: 'numeric',
  });
}
