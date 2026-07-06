/**
 * Hydrates viewer/demo mode from the CURRENT USER's real Firestore data.
 * Must run BEFORE the demo flag flips (all reads here hit real Firestore);
 * afterwards every mutation stays inside the in-memory sandbox.
 */
import { getAllCalls, getAllFinancialsByCallId } from './serviceCallService';
import { getAllPayments } from './paymentService';
import { getAllItems } from './inventoryService';
import { getTargetsOnce } from './targetsService';
import { getArchiveOnce } from './archiveService';
import { getCrewWithdrawalsOnce } from './withdrawalService';
import { getUsersByIds } from './userService';
import { seedDemoFromReal } from './demoStore';
import { Crew } from '../types/crew';
import { PrivateFinancials } from '../types/serviceCall';
import { Payment } from '../types/payment';
import { Withdrawal } from '../types/withdrawal';

export async function hydrateDemoFromReal(crews: Crew[]): Promise<void> {
  const calls = await getAllCalls();
  const [finsById, flatPayments, items, targets, archive] = await Promise.all([
    getAllFinancialsByCallId(calls.map((c) => c.id)),
    getAllPayments(),
    getAllItems(),
    getTargetsOnce().catch(() => ({})),
    getArchiveOnce().catch(() => ({ monthlyProfit: {}, lastExportAt: null })),
  ]);

  const fins: Record<string, PrivateFinancials> = {};
  Object.entries(finsById).forEach(([id, f]) => {
    if (f) fins[id] = f;
  });

  const payments: Record<string, Payment[]> = {};
  flatPayments.forEach((p) => {
    if (!p.callId) return;
    (payments[p.callId] ??= []).push(p);
  });

  const memberIds = [...new Set(crews.flatMap((c) => c.memberIds))];
  const [users, withdrawalsNested] = await Promise.all([
    memberIds.length ? getUsersByIds(memberIds).catch(() => []) : Promise.resolve([]),
    Promise.all(crews.map((c) => getCrewWithdrawalsOnce(c.id).catch(() => [] as Withdrawal[]))),
  ]);

  seedDemoFromReal({
    calls,
    fins,
    payments,
    items,
    crews,
    users,
    withdrawals: withdrawalsNested.flat(),
    targets,
    archiveMonthly: archive.monthlyProfit,
  });
}
