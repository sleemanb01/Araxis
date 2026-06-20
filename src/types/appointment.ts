export type AppointmentStatus = 'scheduled' | 'completed' | 'canceled';

export interface Appointment {
  id: string;
  jobId: string | null;        // linked job, if any
  customerId: string | null;   // linked customer, if any
  technicianId: string | null; // assigned tech uid
  title: string;
  startAt: string;             // ISO
  endAt: string | null;        // ISO, optional
  status: AppointmentStatus;
  createdAt: string;           // ISO
  createdBy: string;           // uid
}

// status defaults to 'scheduled'; createdAt + createdBy are stamped at write time.
export type CreateAppointmentPayload = Omit<
  Appointment,
  'id' | 'createdAt' | 'createdBy' | 'status'
>;
