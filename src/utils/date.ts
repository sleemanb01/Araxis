/** Format a day key ("YYYY-MM-DD") as a Hebrew date, e.g. "יום שני, 29/06/2026". */
export function formatDayLabel(day: string): string {
  return new Date(day + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
