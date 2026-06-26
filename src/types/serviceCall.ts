export type ServiceCallStatus = 'pending' | 'active' | 'completed';

export interface TeamAssignment {
  leadTech: string;     // uid of the lead technician on this call
  assistants: string[]; // uids of assisting (junior) techs
}

export interface Payouts {
  totalTechPayout: number;        // total paid out to the crew for this call (₪)
  splits: Record<string, number>; // uid -> that tech's cut (₪)
}

/**
 * Main service-call document (collection `serviceCalls`). Visible to the
 * assigned crew. Financials live in a separate admin-only subcollection
 * (`privateData/financials`) — see PrivateFinancials.
 */
export interface ServiceCall {
  id: string;
  clientName: string;
  address?: string;                 // job site address
  contactPhone?: string;            // on-site contact phone
  notes?: string;                   // free-text notes for the job
  requiredItems?: string[];         // inventory item ids needed for the job
  status: ServiceCallStatus;
  scheduledDate: string;            // ISO date string
  hardwareUsed: string[];           // inventory item ids consumed on this call
  teamAssignment: TeamAssignment;
  payouts: Payouts;
}

/** Admin-only financials at serviceCalls/{id}/privateData/financials. */
export interface PrivateFinancials {
  overallPrice: number; // what the client is billed (₪)
  paidAmount: number;   // how much the client has paid so far (₪)
}

export type CreateServiceCallPayload = Omit<ServiceCall, 'id'>;

/** A tech is on a call if they lead it or assist on it. */
export function isOnCall(call: ServiceCall, uid: string): boolean {
  return call.teamAssignment.leadTech === uid || call.teamAssignment.assistants.includes(uid);
}
