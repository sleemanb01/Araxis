import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { InventoryItem } from '../types/inventory';
import { callProfit, dayKey } from './finance';

/**
 * Build a CSV report — one row per day: date, jobs, revenue, profit.
 * (Prepend a BOM at the call site so spreadsheets read the Hebrew header.)
 */
export function buildProfitCsv(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[]
): string {
  const byDay = new Map<string, { jobs: number; revenue: number; profit: number }>();
  calls.forEach((c, i) => {
    const k = dayKey(new Date(c.scheduledDate));
    const cur = byDay.get(k) ?? { jobs: 0, revenue: 0, profit: 0 };
    cur.jobs += 1;
    cur.revenue += fins[i]?.overallPrice ?? 0;
    cur.profit += callProfit(c, fins[i], items);
    byDay.set(k, cur);
  });
  const rows = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const header = 'תאריך,עבודות,הכנסה,רווח';
  const lines = rows.map(
    ([day, v]) => `${day},${v.jobs},${Math.round(v.revenue)},${Math.round(v.profit)}`
  );
  return [header, ...lines].join('\n');
}
