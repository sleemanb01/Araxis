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

/** id -> price map for O(1) lookups. Build ONCE before looping over calls. */
export type PriceMap = Map<string, number>;
export function itemPriceMap(items: InventoryItem[]): PriceMap {
  const m: PriceMap = new Map();
  items.forEach((i) => {
    if (typeof i.price === 'number') m.set(i.id, i.price);
  });
  return m;
}

/** Items lookup — a prebuilt PriceMap is O(1); a raw array falls back to find. */
type Items = InventoryItem[] | PriceMap;
function priceIn(items: Items, id: string): number | undefined {
  return items instanceof Map ? items.get(id) : items.find((it) => it.id === id)?.price;
}

/**
 * Cost of a required item on a call. A finished job carries a frozen price
 * snapshot (itemPrices) so later price edits don't change its books; otherwise
 * use the item's current price.
 */
function itemCostOn(call: ServiceCall, id: string, items: Items): number {
  return call.itemPrices?.[id] ?? priceIn(items, id) ?? 0;
}

/** Units of a required item on a call (default 1). */
export function qtyOn(call: ServiceCall, id: string): number {
  return call.itemQuantities?.[id] ?? 1;
}

/** 'billed' counts the client price; 'paid' counts only money received. */
export type ProfitBasis = 'billed' | 'paid';

/** Net profit of a single call: income − equipment cost − crew payout. */
export function callProfit(
  call: ServiceCall,
  fin: PrivateFinancials | null,
  items: Items,
  basis: ProfitBasis = 'billed'
): number {
  const gross = (basis === 'paid' ? fin?.paidAmount : fin?.overallPrice) ?? 0;
  const equip = (call.requiredItems ?? []).reduce(
    (a, id) => a + itemCostOn(call, id, items) * qtyOn(call, id),
    0
  );
  return gross - equip - (call.payouts.totalTechPayout ?? 0);
}

/** Profit grouped by a date key (month or day) across calls; fins[i] ↔ calls[i]. */
function profitByKey(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[],
  keyFn: (d: Date) => string,
  basis: ProfitBasis
): Record<string, number> {
  const map = itemPriceMap(items); // once, not per call
  const out: Record<string, number> = {};
  calls.forEach((c, i) => {
    const key = keyFn(new Date(c.scheduledDate));
    out[key] = (out[key] ?? 0) + callProfit(c, fins[i], map, basis);
  });
  return out;
}

/** Profit per calendar month (key "YYYY-MM"). */
export function monthlyProfit(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[],
  basis: ProfitBasis = 'billed'
): Record<string, number> {
  return profitByKey(calls, fins, items, monthKey, basis);
}

/** Aggregate financial totals across calls; fins[i] is the financials for calls[i]. */
export function aggregateTotals(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  items: InventoryItem[]
): FinancialTotals {
  const map = itemPriceMap(items);
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
      equipment += itemCostOn(c, id, map) * qtyOn(c, id);
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

export const FINANCIAL_STATUS_HE: Record<FinancialStatus, string> = {
  Unpaid: 'לא שולם',
  Partial: 'שולם חלקית',
  'Paid in Full': 'שולם במלואו',
};
