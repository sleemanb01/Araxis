/**
 * Frontend financial derivations. Balance/status are NEVER stored in Firestore —
 * they are computed from overallPrice + paidAmount on the client.
 */
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { InventoryItem } from '../types/inventory';
import { Payment } from '../types/payment';
import { monthlyTaxes, TaxBreakdown } from './tax';

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

export interface BuyNeed {
  id: string;
  name: string;
  qty: number; // units open jobs still need
  stock: number; // on hand across all locations
  buy: number; // units to purchase
  price: number; // actual (cost) price
  cost: number; // buy × price
}

/**
 * Shopping list: what OPEN jobs still need beyond what's on hand anywhere
 * (warehouse + crews), costed at the actual (cost) price. Checked items were
 * already pulled for their job and don't count.
 */
export function buyListForOpenCalls(calls: ServiceCall[], items: InventoryItem[]): BuyNeed[] {
  const need = new Map<string, number>();
  calls.forEach((c) => {
    if (c.status === 'completed') return;
    const checked = new Set(c.checkedItems ?? []);
    (c.requiredItems ?? []).forEach((id) => {
      if (checked.has(id)) return;
      need.set(id, (need.get(id) ?? 0) + qtyOn(c, id));
    });
  });
  const byId = new Map(items.map((i) => [i.id, i])); // once, not per entry
  return Array.from(need.entries())
    .map(([id, qty]) => {
      const item = byId.get(id);
      const stock = item ? Object.values(item.locations).reduce((s, n) => s + (n ?? 0), 0) : 0;
      const buy = Math.max(0, qty - stock);
      const price = item?.price ?? 0;
      return { id, name: item?.itemName ?? '—', qty, stock, buy, price, cost: buy * price };
    })
    .filter((n) => n.buy > 0)
    .sort((a, b) => b.cost - a.cost);
}

/**
 * The month's tax breakdown on a CASH basis — the MONTHLY POCKET. Revenue is
 * the money actually received this month by payment date (manual "שולם"
 * leftovers with no records fall back to the job's date); costs follow the
 * owner's formula from the month's jobs, plus general expenses and the open
 * shopping list. One implementation for the ring AND the details screen.
 */
export function monthPocketTaxes(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  payments: Payment[],
  items: InventoryItem[],
  monthExpenses: number
): TaxBreakdown {
  const month = monthKey(new Date());
  let pocket = 0;
  const paidByCall: Record<string, number> = {};
  payments.forEach((p) => {
    if (p.status !== 'issued') return;
    if (p.callId) paidByCall[p.callId] = (paidByCall[p.callId] ?? 0) + p.amount;
    if ((p.date || p.createdAt).slice(0, 7) === month) pocket += p.amount;
  });
  calls.forEach((c, i) => {
    const manual = (fins[i]?.paidAmount ?? 0) - (paidByCall[c.id] ?? 0);
    if (manual > 0 && monthKey(new Date(c.scheduledDate)) === month) pocket += manual;
  });
  const pairs = calls
    .map((c, i) => [c, fins[i]] as const)
    .filter(([c]) => monthKey(new Date(c.scheduledDate)) === month);
  const totals = aggregateTotals(pairs.map(([c]) => c), pairs.map(([, f]) => f), items);
  const toBuy = buyListForOpenCalls(calls, items).reduce((s, n) => s + n.cost, 0);
  return monthlyTaxes({
    revenue: pocket,
    equipment: totals.equipment,
    crew: totals.payouts,
    expenses: monthExpenses,
    toBuy,
  });
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
