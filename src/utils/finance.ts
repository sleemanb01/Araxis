/**
 * Frontend financial derivations. Balance/status are NEVER stored in Firestore —
 * they are computed from overallPrice + paidAmount on the client.
 */

export type FinancialStatus = 'Unpaid' | 'Partial' | 'Paid in Full';

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
