export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string;
  userId: string | null;   // linked registered app account (CustomerProfile.uid), if any
  createdAt: string;       // ISO
  createdBy: string;       // uid of the technician who added them
}

// createdAt + createdBy are stamped server-side by the service at write time.
export type CreateCustomerPayload = Omit<Customer, 'id' | 'createdAt' | 'createdBy'>;
