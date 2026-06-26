/**
 * Frontend financial derivations. Balance/status are NEVER stored in Firestore —
 * they are computed from overallPrice + paidAmount on the client.
 */
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { InventoryItem } from '../types/inventory';

export type FinancialStatus = 'Unpaid' | 'Partial' | 'Paid in Full';

export interface FinancialTotals {
  gross: number;       // total client price
  revenue: number;     // gross − equipment cost
  paid: number;
  outstanding: number; // gross − paid (what the client still owes)
  payouts: number;
  equipment: number;   // sum of required items' prices
  profit: number;      // revenue − payouts
}

/** Calendar-month key for a date, e.g. "2026-06". */
export function monthKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

/** Full-date key for a date, e.g. "2026-06-26". */
export function dayKey(d: Date): string {
  return monthKey(d) + '-' + String(d.getDate()).padStart(2, '0');
}

/** Net profit of a single call: client price − equipment cost − crew payout. */
export function callProfit(
  call: ServiceCall,
  fin: PrivateFinancials | null,
  items: InventoryItem[]
): number {
  const gross = fin?.overallPrice ?? 0;
  const equip = (call.requiredItems ?? []).reduce(
    (a, id) => a + (items.find((it) => it.id === id)?.price ?? 0),
    0
  );
  return gross - equip - (call.payouts.totalTechPayout ?? 0);
}

/** Profit grouped by a date key (month or day) across calls; fins[i] ↔ calls[i]. */
function profitByKey(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[],
  keyFn: (d: Date) => string
): Record<string, number> {
  const out: Record<string, number> = {};
  calls.forEach((c, i) => {
    const key = keyFn(new Date(c.scheduledDate));
    out[key] = (out[key] ?? 0) + callProfit(c, fins[i], items);
  });
  return out;
}

/** Profit per calendar month (key "YYYY-MM"). */
export function monthlyProfit(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[]
): Record<string, number> {
  return profitByKey(calls, fins, items, monthKey);
}

/** Profit per day (key "YYYY-MM-DD"). */
export function dailyProfit(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[]
): Record<string, number> {
  return profitByKey(calls, fins, items, dayKey);
}

/** Aggregate financial totals across calls; fins[i] is the financials for calls[i]. */
export function aggregateTotals(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[]
): FinancialTotals {
  let gross = 0;
  let paid = 0;
  let payouts = 0;
  let equipment = 0;
  calls.forEach((c, i) => {
    const f = fins[i];
    if (f) {
      gross += f.overallPrice || 0;
      paid += f.paidAmount || 0;
    }
    payouts += c.payouts.totalTechPayout || 0;
    (c.requiredItems ?? []).forEach((id) => {
      equipment += items.find((it) => it.id === id)?.price ?? 0;
    });
  });
  const revenue = gross - equipment;
  return { gross, revenue, paid, outstanding: gross - paid, payouts, equipment, profit: revenue - payouts };
}

export function financialStatus(overallPrice: number, paidAmount: number): FinancialStatus {
  if (paidAmount <= 0) return 'Unpaid';
  if (paidAmount >= overallPrice) return 'Paid in Full';
  return 'Partial';
}

export function balanceDue(overallPrice: number, paidAmount: number): number {
  return Math.max(0, overallPrice - paidAmount);
}

/** Business profit on a call after crew payouts. */
export function profit(overallPrice: number, totalTechPayout: number): number {
  return overallPrice - totalTechPayout;
}

export const FINANCIAL_STATUS_HE: Record<FinancialStatus, string> = {
  Unpaid: 'לא שולם',
  Partial: 'שולם חלקית',
  'Paid in Full': 'שולם במלואו',
};
