export type JobStatus =
  | 'awaiting'      // Red   — Awaiting Coordination
  | 'scheduled'     // Yellow — Coordinated / Scheduled
  | 'en_route'      // Orange — En Route
  | 'in_progress'   // Blue   — In Progress
  | 'completed';    // Green  — Completed

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface Job {
  id: string;
  customerId?: string | null; // link to a Customer record, if any
  customerName: string;
  address: string;
  phone: string;
  description: string;
  status: JobStatus;
  assignedTo: string | null; // null = general pool
  createdAt: string;         // ISO date string
  scheduledAt: string | null;
  price?: number | null;          // optional quote/price in ₪
  paymentStatus?: PaymentStatus;  // 'unpaid' (default) | 'partial' | 'paid'
  completionDate?: string | null; // ISO timestamp set when the work was finished
  customerConfirmed?: boolean;    // customer acknowledged the work is done
  notes: string[];
  photos: string[];          // local URIs or remote URLs
}

export type CreateJobPayload = Omit<Job, 'id' | 'createdAt' | 'notes' | 'photos'>;
export type UpdateJobStatusPayload = { id: string; status: JobStatus };
