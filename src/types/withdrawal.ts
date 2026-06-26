/**
 * A warehouse→crew withdrawal log entry (collection: "withdrawals").
 * Records who withdrew what and how much, for each crew's history.
 */
export interface Withdrawal {
  id: string;
  crewId: string;
  itemId: string;
  itemName?: string;
  withdrawerId: string;
  amount: number;
  type: 'withdraw' | 'return'; // warehouse→crew, or crew→warehouse
  createdAt: string; // ISO
}
