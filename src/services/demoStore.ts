/**
 * In-memory sandbox behind viewer/demo mode. Seeded with realistic data;
 * every mutation touches ONLY this store and notifies subscribers, so the app
 * feels fully live while the real database is never read or written.
 */
import { ServiceCall, CreateServiceCallPayload, PrivateFinancials } from '../types/serviceCall';
import { InventoryItem, CreateInventoryPayload, WAREHOUSE, crewLocation } from '../types/inventory';
import { UserProfile, Capabilities, ALL_CAPS, NO_CAPS } from '../types/user';
import { Crew } from '../types/crew';
import { Withdrawal } from '../types/withdrawal';
import { Payment, PaymentMethod, DocKind } from '../types/payment';
import { monthKey } from '../utils/finance';

export const DEMO_UID = 'demo-viewer';
const DEMO_CREW = 'demo-crew';
const DEMO_TECH = 'demo-tech';

// ---------------------------------------------------------------------------
// State (reseeded on every demo entry)
// ---------------------------------------------------------------------------
let calls: ServiceCall[] = [];
let items: InventoryItem[] = [];
let crews: Crew[] = [];
let users: UserProfile[] = [];
let withdrawals: Withdrawal[] = [];
let fins: Record<string, PrivateFinancials> = {};
let payments: Record<string, Payment[]> = {};
let targets: Record<string, number> = {};
let archiveMonthly: Record<string, number> = {};
let seq = 0;

const id = (p: string) => `${p}-${++seq}`;
const iso = (daysFromToday: number, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};
const monthAgoKey = (n: number) => {
  const d = new Date();
  return monthKey(new Date(d.getFullYear(), d.getMonth() - n, 1));
};

function mkCall(p: Partial<ServiceCall> & { clientName: string; scheduledDate: string }): ServiceCall {
  return {
    id: id('call'),
    status: 'pending',
    hardwareUsed: [],
    requiredItems: [],
    checkedItems: [],
    crewId: DEMO_CREW,
    teamAssignment: { leadTech: DEMO_UID, assistants: [DEMO_TECH] },
    payouts: { totalTechPayout: 0, splits: {} },
    ...p,
  };
}

export function resetDemo(): void {
  seq = 0;

  users = [
    { uid: DEMO_UID, name: 'מצב הדגמה', phone: '', teamId: 'demo', caps: ALL_CAPS, crewIds: [DEMO_CREW] } as any,
    { uid: DEMO_TECH, name: 'טכנאי הדגמה', phone: '+972501111111', teamId: 'demo', caps: NO_CAPS, crewIds: [DEMO_CREW] } as any,
  ];
  crews = [
    {
      id: DEMO_CREW,
      name: 'צוות הדגמה',
      manager: DEMO_UID,
      members: { [DEMO_UID]: ALL_CAPS, [DEMO_TECH]: { ...NO_CAPS, viewAllCalls: true } },
      memberIds: [DEMO_UID, DEMO_TECH],
    },
  ];

  items = [
    { id: id('item'), itemName: 'מצלמת אבטחה 4MP', barcode: '7290001110011', price: 450, customerPrice: 650, locations: { [WAREHOUSE]: 12, [crewLocation(DEMO_CREW)]: 2 } },
    { id: id('item'), itemName: 'כבל רשת 20 מ׳', barcode: '7290001110028', price: 60, customerPrice: 110, locations: { [WAREHOUSE]: 3 } },
    { id: id('item'), itemName: 'מסך אינטרקום', barcode: '7290001110035', price: 380, customerPrice: 520, locations: { [WAREHOUSE]: 6, [crewLocation(DEMO_CREW)]: 1 } },
    { id: id('item'), itemName: 'ספק כוח 12V', barcode: '7290001110042', price: 45, customerPrice: 80, locations: { [WAREHOUSE]: 25 } },
    { id: id('item'), itemName: 'כונן הקלטה NVR', barcode: '7290001110059', price: 900, customerPrice: 1250, locations: { [WAREHOUSE]: 4 } },
  ];
  const [cam, cable, screen] = items;

  calls = [
    mkCall({ clientName: 'משפחת כהן', scheduledDate: iso(0, 9), address: 'הרצל 12, חיפה', contactPhone: '+972501234567', notes: 'התקנת 2 מצלמות בחניה', requiredItems: [cam.id, cable.id], itemQuantities: { [cam.id]: 2 }, payouts: { totalTechPayout: 400, splits: {} } }),
    mkCall({ clientName: 'דוד לוי', scheduledDate: iso(0, 12), status: 'active', address: 'בן גוריון 8, קריית אתא', contactPhone: '+972502222333', requiredItems: [screen.id], checkedItems: [screen.id], payouts: { totalTechPayout: 350, splits: {} } }),
    mkCall({ clientName: 'מסעדת הגן', scheduledDate: iso(1, 10), address: 'העצמאות 3, עכו', contactPhone: '+972503334444', notes: 'הצעת מחיר למערכת מלאה' }),
    mkCall({ clientName: 'בית ספר אורנים', scheduledDate: iso(3, 8), address: 'האלון 15, נשר', contactPhone: '+972504445555' }),
    mkCall({ clientName: 'חנות פרחים ליבי', scheduledDate: iso(-10, 11), status: 'completed', address: 'הנשיא 22, חיפה', contactPhone: '+972505556666', requiredItems: [cable.id], checkedItems: [cable.id], itemPrices: { [cable.id]: 60 }, payouts: { totalTechPayout: 300, splits: {} } }),
    mkCall({ clientName: 'משרד עו״ד ברק', scheduledDate: iso(-35, 9), status: 'completed', address: 'הפלמ״ח 7, חיפה', contactPhone: '+972506667777', requiredItems: [cam.id], checkedItems: [cam.id], itemPrices: { [cam.id]: 450 }, payouts: { totalTechPayout: 600, splits: {} } }),
    mkCall({ clientName: 'קפה נמל', scheduledDate: iso(-40, 13), status: 'completed', contactPhone: '+972507778888', payouts: { totalTechPayout: 250, splits: {} } }),
  ];
  const [c1, c2, c3, , c5, c6, c7] = calls;
  fins = {
    [c1.id]: { overallPrice: 2400, paidAmount: 0 },
    [c2.id]: { overallPrice: 1800, paidAmount: 500 },
    [c3.id]: { overallPrice: 5200, paidAmount: 1000 },
    [c5.id]: { overallPrice: 2000, paidAmount: 2000 },
    [c6.id]: { overallPrice: 4000, paidAmount: 1500 },
    [c7.id]: { overallPrice: 2600, paidAmount: 2600 },
  };
  payments = {
    [c5.id]: [{ id: id('pay'), amount: 2000, method: 'cash', date: iso(-10).slice(0, 10), docKind: 'receipt', status: 'issued', createdAt: iso(-10, 12) }],
    [c6.id]: [{ id: id('pay'), amount: 1500, method: 'bank_transfer', date: iso(-35).slice(0, 10), docKind: 'receipt', status: 'issued', createdAt: iso(-35, 15) }],
  };
  withdrawals = [
    { id: id('wd'), crewId: DEMO_CREW, itemId: cam.id, itemName: cam.itemName, withdrawerId: DEMO_UID, amount: 2, type: 'withdraw', createdAt: iso(-2, 8) },
    { id: id('wd'), crewId: DEMO_CREW, itemId: screen.id, itemName: screen.itemName, withdrawerId: DEMO_TECH, amount: 1, type: 'withdraw', createdAt: iso(-1, 9) },
  ];
  targets = { [monthKey(new Date())]: 20000 };
  archiveMonthly = { [monthAgoKey(2)]: 18500, [monthAgoKey(3)]: 21400 };
  emit();
}

// ---------------------------------------------------------------------------
// Pub-sub: every change notifies all subscribers, each recomputing its slice
// (the data set is tiny, so this stays trivially fast).
// ---------------------------------------------------------------------------
const subscribers = new Set<() => void>();
function emit() {
  subscribers.forEach((fn) => fn());
}
export function demoSubscribe<T>(compute: () => T, cb: (v: T) => void): () => void {
  const fire = () => cb(compute());
  subscribers.add(fire);
  fire();
  return () => {
    subscribers.delete(fire);
  };
}

// ---------------------------------------------------------------------------
// Read slices
// ---------------------------------------------------------------------------
export const demoCalls = () => [...calls];
export const demoCall = (callId: string) => calls.find((c) => c.id === callId) ?? null;
export const demoItems = () => [...items];
export const demoCrews = () => [...crews];
export const demoUsers = (ids?: string[]) => (ids ? users.filter((u) => ids.includes(u.uid)) : [...users]);
export const demoUserByPhone = (phone: string) => users.find((u) => (u as any).phone === phone) ?? null;
export const demoProfile = () => users.find((u) => u.uid === DEMO_UID)!;
export const demoFin = (callId: string) => fins[callId] ?? null;
export const demoFins = () => ({ ...fins });
export const demoPayments = (callId: string) => [...(payments[callId] ?? [])];
export const demoAllPayments = () =>
  Object.entries(payments).flatMap(([callId, list]) => list.map((p) => ({ ...p, callId })));
export const demoWithdrawals = (crewId: string) =>
  withdrawals.filter((w) => w.crewId === crewId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const demoTargets = () => ({ ...targets });
export const demoArchive = () => ({ monthlyProfit: { ...archiveMonthly }, lastExportAt: new Date().toISOString() });

// ---------------------------------------------------------------------------
// Mutations (mirror the Firestore service semantics, then emit)
// ---------------------------------------------------------------------------
export function demoCreateCall(payload: CreateServiceCallPayload): string {
  const call: ServiceCall = { ...payload, id: id('call') } as ServiceCall;
  calls = [...calls, call];
  emit();
  return call.id;
}

export function demoUpdateCall(callId: string, patch: Partial<ServiceCall>): void {
  calls = calls.map((c) => (c.id === callId ? { ...c, ...patch } : c));
  emit();
}

export function demoSetFin(callId: string, fin: Partial<PrivateFinancials>): void {
  const cur = fins[callId] ?? { overallPrice: 0, paidAmount: 0 };
  fins[callId] = { ...cur, ...fin };
  emit();
}

export function demoAddPayment(input: {
  callId: string;
  amount: number;
  method: PaymentMethod;
  date?: string;
  note?: string;
  docKind?: DocKind;
}): void {
  const amount = Math.round(input.amount * 100) / 100;
  const list = payments[input.callId] ?? [];
  const issued = list.reduce((s, p) => s + (p.status === 'issued' ? p.amount : 0), 0);
  const total = fins[input.callId]?.overallPrice ?? 0;
  if (total > 0 && issued + amount > total + 0.005) {
    throw new Error(
      `הסכום גדול מהיתרה הפתוחה (נותרו ₪${Math.max(0, Math.round(total - issued)).toLocaleString('he-IL')}).`
    );
  }
  payments[input.callId] = [
    ...list,
    {
      id: id('pay'),
      amount,
      method: input.method,
      date: input.date ?? new Date().toISOString().slice(0, 10),
      note: input.note || undefined,
      docKind: input.docKind ?? 'receipt',
      status: 'issued',
      createdAt: new Date().toISOString(),
    },
  ];
  demoSetFin(input.callId, { paidAmount: issued + amount });
}

export function demoCreateItem(payload: CreateInventoryPayload): string {
  const item: InventoryItem = { ...payload, id: id('item') } as InventoryItem;
  items = [...items, item];
  emit();
  return item.id;
}

export function demoUpdateItem(itemId: string, patch: Partial<InventoryItem>): void {
  items = items.map((i) => (i.id === itemId ? { ...i, ...patch } : i));
  emit();
}

export function demoDeleteItem(itemId: string): void {
  items = items.filter((i) => i.id !== itemId);
  emit();
}

export function demoAdjustQty(itemId: string, location: string, delta: number): void {
  items = items.map((i) =>
    i.id === itemId
      ? { ...i, locations: { ...i.locations, [location]: (i.locations[location] ?? 0) + delta } }
      : i
  );
  emit();
}

export function demoMoveStock(
  item: InventoryItem,
  qty: number,
  crewId: string,
  actorId: string,
  type: 'withdraw' | 'return'
): void {
  const from = type === 'withdraw' ? WAREHOUSE : crewLocation(crewId);
  const to = type === 'withdraw' ? crewLocation(crewId) : WAREHOUSE;
  items = items.map((i) =>
    i.id === item.id
      ? {
          ...i,
          locations: {
            ...i.locations,
            [from]: (i.locations[from] ?? 0) - qty,
            [to]: (i.locations[to] ?? 0) + qty,
          },
        }
      : i
  );
  withdrawals = [
    ...withdrawals,
    { id: id('wd'), crewId, itemId: item.id, itemName: item.itemName, withdrawerId: actorId, amount: qty, type, createdAt: new Date().toISOString() },
  ];
  emit();
}

export function demoSetTarget(month: string, amount: number): void {
  targets = { ...targets, [month]: amount };
  emit();
}

export function demoArchiveAndErase(monthlyDelta: Record<string, number>): void {
  Object.entries(monthlyDelta).forEach(([k, v]) => {
    archiveMonthly[k] = (archiveMonthly[k] ?? 0) + v;
  });
  const doneIds = new Set(calls.filter((c) => c.status === 'completed').map((c) => c.id));
  calls = calls.filter((c) => !doneIds.has(c.id));
  doneIds.forEach((cid) => {
    delete fins[cid];
    delete payments[cid];
  });
  emit();
}

export function demoSetCrewCaps(crewId: string, uid: string, caps: Capabilities): void {
  crews = crews.map((c) =>
    c.id === crewId
      ? { ...c, members: { ...c.members, [uid]: caps }, memberIds: c.memberIds.includes(uid) ? c.memberIds : [...c.memberIds, uid] }
      : c
  );
  emit();
}

export function demoRemoveCrewMember(crewId: string, uid: string): void {
  crews = crews.map((c) => {
    if (c.id !== crewId) return c;
    const members = { ...c.members };
    delete members[uid];
    return { ...c, members, memberIds: c.memberIds.filter((m) => m !== uid) };
  });
  emit();
}

export function demoCreateCrew(name: string): string {
  const crewId = id('crew');
  crews = [
    ...crews,
    { id: crewId, name, manager: DEMO_UID, members: { [DEMO_UID]: ALL_CAPS }, memberIds: [DEMO_UID] },
  ];
  emit();
  return crewId;
}
