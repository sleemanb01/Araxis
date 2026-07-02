/** Shekel display formatting, e.g. ₪12,345. */
export function ils(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}
