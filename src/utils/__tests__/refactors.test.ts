/**
 * Equivalence tests for the refactors/optimizations:
 *  - pocketFor()        vs the OLD inline day/month pocket implementations
 *  - buyListForCall()   vs the OLD inline card shopping-list implementation
 *  - awaitWrite()       timing/rejection semantics
 *  - monthlyTaxes()     regression anchor on the owner's real numbers
 *
 * The old logic is embedded here verbatim as reference implementations, so
 * a behavioral drift in the shared utils fails loudly.
 *
 * Run: npm test   (tsx --test, Node's built-in runner — no app/RN imports)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pocketFor, buyListForCall, dayKey, monthKey, qtyOn } from '../finance';
import { monthlyTaxes } from '../tax';
import { awaitWrite } from '../promise';
import type { ServiceCall, PrivateFinancials } from '../../types/serviceCall';
import type { InventoryItem } from '../../types/inventory';
import type { Payment } from '../../types/payment';

// ---------- fixtures ----------

function call(p: Partial<ServiceCall> & { id: string }): ServiceCall {
  return {
    clientName: 'לקוח בדיקה',
    status: 'pending',
    scheduledDate: new Date().toISOString(),
    hardwareUsed: [],
    teamAssignment: { leadTech: 'u1', assistants: [] },
    payouts: { totalTechPayout: 0, splits: {} },
    ...p,
  };
}

function payment(p: Partial<Payment> & { id: string }): Payment {
  return {
    amount: 0,
    method: 'cash',
    date: '',
    docKind: 'receipt',
    status: 'issued',
    createdAt: new Date().toISOString(),
    ...p,
  };
}

function item(p: Partial<InventoryItem> & { id: string }): InventoryItem {
  return { itemName: p.id, locations: {}, ...p };
}

// Local-timezone-safe date fixtures (dayKey/monthKey use local time).
const TODAY = new Date(2026, 6, 8, 10, 0, 0); // 2026-07-08 local
const TODAY_KEY = dayKey(TODAY); // "2026-07-08"
const MONTH_KEY = monthKey(TODAY); // "2026-07"
const OTHER_DAY = new Date(2026, 6, 3, 9, 0, 0);
const NEXT_MONTH = new Date(2026, 7, 15, 9, 0, 0);

// ---------- OLD reference implementations (copied pre-refactor) ----------

/** OLD ProfileScreen.todayCollected — payments strictly by p.date equality. */
function oldTodayCollected(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  payments: Payment[],
  today: string
): number {
  let day = 0;
  const paidByCall: Record<string, number> = {};
  payments.forEach((p) => {
    if (p.status !== 'issued') return;
    if (p.callId) paidByCall[p.callId] = (paidByCall[p.callId] ?? 0) + p.amount;
    if (p.date === today) day += p.amount;
  });
  calls.forEach((c, i) => {
    const manual = (fins[i]?.paidAmount ?? 0) - (paidByCall[c.id] ?? 0);
    if (manual > 0 && dayKey(new Date(c.scheduledDate)) === today) day += manual;
  });
  return day;
}

/** OLD monthPocketTaxes internals — month by slice(0,7) equality. */
function oldMonthPocket(
  calls: ServiceCall[],
  fins: (PrivateFinancials | null)[],
  payments: Payment[],
  month: string
): number {
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
  return pocket;
}

/** OLD ServiceCallCard inline buy list (with its completed-status guard). */
function oldCardBuyList(c: ServiceCall, items: InventoryItem[]) {
  const buyList: { id: string; buy: number; price: number; cost: number }[] = [];
  if (c.status !== 'completed') {
    const checked = new Set(c.checkedItems ?? []);
    (c.requiredItems ?? []).forEach((id) => {
      if (checked.has(id)) return;
      const it = items.find((i) => i.id === id);
      const stock = it ? Object.values(it.locations).reduce((s, n) => s + (n ?? 0), 0) : 0;
      const qty = qtyOn(c, id);
      const buy = Math.max(0, qty - stock);
      if (buy <= 0) return;
      const price = it?.price ?? 0;
      buyList.push({ id, buy, price, cost: buy * price });
    });
    buyList.sort((a, b) => b.cost - a.cost);
  }
  return buyList;
}

// ---------- pocketFor ----------

test('pocketFor(day) equals the old day logic when payments carry dates', () => {
  const calls = [
    call({ id: 'a', scheduledDate: TODAY.toISOString() }),
    call({ id: 'b', scheduledDate: OTHER_DAY.toISOString() }),
    call({ id: 'c', scheduledDate: TODAY.toISOString() }),
  ];
  const fins: (PrivateFinancials | null)[] = [
    { overallPrice: 1000, paidAmount: 700 }, // 500 in records → manual 200 (job today)
    { overallPrice: 800, paidAmount: 300 }, // manual 300 but job on another day
    null,
  ];
  const payments = [
    payment({ id: 'p1', callId: 'a', amount: 500, date: TODAY_KEY }),
    payment({ id: 'p2', callId: 'b', amount: 0, date: TODAY_KEY }),
    payment({ id: 'p3', callId: 'a', amount: 999, date: TODAY_KEY, status: 'failed' }), // ignored
    payment({ id: 'p4', callId: 'c', amount: 250, date: dayKey(OTHER_DAY) }), // other day
  ];
  const oldV = oldTodayCollected(calls, fins, payments, TODAY_KEY);
  const newV = pocketFor(TODAY_KEY, calls, fins, payments);
  assert.equal(newV, oldV);
  assert.equal(newV, 500 + 200); // records today + manual leftover of today's job
});

test('pocketFor(month) equals the old month logic', () => {
  const calls = [
    call({ id: 'a', scheduledDate: TODAY.toISOString() }),
    call({ id: 'z', scheduledDate: NEXT_MONTH.toISOString() }),
  ];
  const fins: (PrivateFinancials | null)[] = [
    { overallPrice: 2000, paidAmount: 1200 }, // 800 records → 400 manual this month
    { overallPrice: 500, paidAmount: 100 }, // manual on a NEXT-month job — excluded
  ];
  const payments = [
    payment({ id: 'p1', callId: 'a', amount: 800, date: TODAY_KEY }),
    payment({ id: 'p2', callId: 'z', amount: 0, date: dayKey(NEXT_MONTH) }),
    // paid THIS month for a NEXT-month job — counts in this month's pocket:
    payment({ id: 'p3', callId: 'z', amount: 300, date: TODAY_KEY }),
  ];
  const oldV = oldMonthPocket(calls, fins, payments, MONTH_KEY);
  const newV = pocketFor(MONTH_KEY, calls, fins, payments);
  assert.equal(newV, oldV);
  assert.equal(newV, 800 + 400 + 300);
});

test('pocketFor: manual money never double-counts and never goes negative', () => {
  const calls = [call({ id: 'a', scheduledDate: TODAY.toISOString() })];
  // paidAmount BELOW the record sum (correction case) → no negative manual.
  const fins: (PrivateFinancials | null)[] = [{ overallPrice: 1000, paidAmount: 400 }];
  const payments = [payment({ id: 'p1', callId: 'a', amount: 500, date: TODAY_KEY })];
  assert.equal(pocketFor(TODAY_KEY, calls, fins, payments), 500);
});

test('pocketFor: DOCUMENTED delta — dateless payments fall back to createdAt (old day logic dropped them)', () => {
  const calls: ServiceCall[] = [];
  const p = payment({ id: 'p1', callId: 'a', amount: 100, date: '', createdAt: TODAY.toISOString() });
  assert.equal(oldTodayCollected(calls, [], [p], TODAY_KEY), 0); // old: lost
  assert.equal(pocketFor(TODAY_KEY, calls, [], [p]), 100); // new: attributed by createdAt
});

// ---------- buyListForCall ----------

test('buyListForCall equals the old card logic (checked, quantities, stock, sorting)', () => {
  const items = [
    item({ id: 'i1', price: 100, locations: { warehouse: 1 } }), // need 3 → buy 2, cost 200
    item({ id: 'i2', price: 500, locations: {} }), // need 1 → buy 1, cost 500
    item({ id: 'i3', price: 50, locations: { warehouse: 2, crew_x: 3 } }), // stock 5 ≥ need
    item({ id: 'i4', price: 80, locations: {} }), // checked — excluded
  ];
  const c = call({
    id: 'a',
    requiredItems: ['i1', 'i2', 'i3', 'i4'],
    itemQuantities: { i1: 3, i3: 4 }, // i2/i4 default to 1
    checkedItems: ['i4'],
  });
  const oldV = oldCardBuyList(c, items);
  const newV = buyListForCall(c, items);
  assert.deepEqual(
    newV.map((n) => ({ id: n.id, buy: n.buy, price: n.price, cost: n.cost })),
    oldV
  );
  assert.deepEqual(newV.map((n) => n.id), ['i2', 'i1']); // sorted by cost desc
});

test('buyListForCall: completed job has no shopping list (matches the old card guard)', () => {
  const items = [item({ id: 'i1', price: 100, locations: {} })];
  const done = call({ id: 'a', status: 'completed', requiredItems: ['i1'] });
  assert.deepEqual(buyListForCall(done, items), []);
  assert.deepEqual(oldCardBuyList(done, items), []);
});

test('buyListForCall: unknown item id costs 0 but still lists the shortage', () => {
  const c = call({ id: 'a', requiredItems: ['ghost'] });
  const list = buyListForCall(c, []);
  assert.equal(list.length, 1);
  assert.equal(list[0].buy, 1);
  assert.equal(list[0].cost, 0);
});

// ---------- awaitWrite ----------

test('awaitWrite: resolves ok on success, before the timeout', async () => {
  assert.equal(await awaitWrite(Promise.resolve('x'), 1000), 'ok');
});

test('awaitWrite: real rejections still throw', async () => {
  await assert.rejects(awaitWrite(Promise.reject(new Error('rules')), 1000), /rules/);
});

test('awaitWrite: a pending write resolves queued after the timeout', async () => {
  const never = new Promise(() => {});
  const t0 = Date.now();
  assert.equal(await awaitWrite(never, 30), 'queued');
  assert.ok(Date.now() - t0 >= 25);
});

test('awaitWrite: late rejection after queued does not crash (no unhandled rejection)', async () => {
  let rejectLate: (e: Error) => void = () => {};
  const p = new Promise((_, rej) => (rejectLate = rej));
  assert.equal(await awaitWrite(p, 10), 'queued');
  rejectLate(new Error('server said no, later'));
  await new Promise((r) => setTimeout(r, 20)); // an unhandled rejection here would fail the run
});

// ---------- monthlyTaxes regression (owner's real numbers) ----------

test("monthlyTaxes: the owner's worked example — pre-tax and net identities", () => {
  // revenue 6500, expenses 2000, equipment 1863 (so /1.18 ≈ 1579), no crew.
  const b = monthlyTaxes({ revenue: 6500, equipment: 1863, crew: 0, expenses: 2000 });
  assert.equal(Math.round(b.preTax), 2921); // 6500 − 2000 − 1863/1.18
  // VAT payable = (6500 − 1863 − 2000) × 18/118
  assert.equal(Math.round(b.vat), Math.round((6500 - 1863 - 2000) * (0.18 / 1.18)));
  // The net circle must always equal preTax − vat − incomeTax − nationalInsurance.
  assert.ok(Math.abs(b.net - (b.preTax - b.vat - b.incomeTax - b.nationalInsurance)) < 1e-9);
});

test('monthlyTaxes: the pending shopping list reduces pre-tax but not VAT', () => {
  const base = monthlyTaxes({ revenue: 10000, equipment: 0, crew: 0, expenses: 0 });
  const withBuy = monthlyTaxes({ revenue: 10000, equipment: 0, crew: 0, expenses: 0, toBuy: 1000 });
  assert.equal(withBuy.preTax, base.preTax - 1000);
  assert.equal(withBuy.vat, base.vat);
});

test('monthlyTaxes: no income tax or NI on a loss month', () => {
  const b = monthlyTaxes({ revenue: 1000, equipment: 5000, crew: 0, expenses: 0 });
  assert.ok(b.preTax < 0);
  assert.equal(b.incomeTax, 0);
  assert.equal(b.nationalInsurance, 0);
});
