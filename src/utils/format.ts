/** Shekel display formatting, e.g. ₪12,345. */
export function ils(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

/** Case-insensitive substring match (Hebrew unaffected; Latin normalized). */
export function containsCI(haystack: string | undefined, needle: string): boolean {
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

/** Case-insensitive equality. */
export function equalsCI(a: string | undefined, b: string): boolean {
  return (a ?? '').toLowerCase() === b.toLowerCase();
}
