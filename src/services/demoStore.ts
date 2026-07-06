/**
 * In-memory sandbox behind viewer/demo mode. Seeded with realistic data;
 * every mutation touches ONLY this store and notifies subscribers, so the app
 * feels fully live while the real database is never read or written.
 */
import { ServiceCall, CreateServiceCallPayload, PrivateFinancials } from '../types/serviceCall';
import { InventoryItem, CreateInventoryPayload, WAREHOUSE, crewLocation } from '../types/inventory';
import { UserProfile, Capabilities, ALL_CAPS } from '../types/user';
import { Crew } from '../types/crew';
import { Withdrawal } from '../types/withdrawal';
import { Payment, PaymentMethod, DocKind } from '../types/payment';

export const DEMO_UID = 'demo-viewer';

// ---------------------------------------------------------------------------
// State (hydrated from the real data on every demo entry)
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

/**
 * Hydrate the sandbox from a SNAPSHOT of the real Firestore data (owner demo:
 * real numbers, sandboxed writes). The demo viewer profile is appended so the
 * fake auth user resolves; everything else is the real data, copied.
 */
export function seedDemoFromReal(payload: {
  calls: ServiceCall[];
  fins: Record<string, PrivateFinancials>;
  payments: Record<string, Payment[]>;
  items: InventoryItem[];
  crews: Crew[];
  users: UserProfile[];
  withdrawals: Withdrawal[];
  targets: Record<string, number>;
  archiveMonthly: Record<string, number>;
}): void {
  seq = 0;
  calls = payload.calls.map((c) => ({ ...c }));
  fins = { ...payload.fins };
  payments = Object.fromEntries(
    Object.entries(payload.payments).map(([k, v]) => [k, v.map((p) => ({ ...p }))])
  );
  items = payload.items.map((i) => ({ ...i, locations: { ...i.locations } }));
  crews = payload.crews.map((c) => ({ ...c, members: { ...c.members }, memberIds: [...c.memberIds] }));
  users = [
    { uid: DEMO_UID, name: 'מצב הדגמה', phone: '', teamId: 'demo', caps: ALL_CAPS, crewIds: crews.map((c) => c.id) } as any,
    ...payload.users.map((u) => ({ ...u })),
  ];
  withdrawals = payload.withdrawals.map((w) => ({ ...w }));
  targets = { ...payload.targets };
  archiveMonthly = { ...payload.archiveMonthly };
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
