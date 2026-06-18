export type JobStatus =
  | 'awaiting'      // Red   — Awaiting Coordination
  | 'scheduled'     // Yellow — Coordinated / Scheduled
  | 'en_route'      // Orange — En Route
  | 'in_progress'   // Blue   — In Progress
  | 'completed';    // Green  — Completed

export interface Job {
  id: string;
  customerName: string;
  address: string;
  phone: string;
  description: string;
  status: JobStatus;
  assignedTo: string | null; // null = general pool
  createdAt: string;         // ISO date string
  scheduledAt: string | null;
  notes: string[];
  photos: string[];          // local URIs or remote URLs
}

export type CreateJobPayload = Omit<Job, 'id' | 'createdAt' | 'notes' | 'photos'>;
export type UpdateJobStatusPayload = { id: string; status: JobStatus };
