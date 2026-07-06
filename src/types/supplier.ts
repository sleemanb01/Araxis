/** A supplier contact (collection `suppliers`). */
export interface Supplier {
  id: string;
  name: string;
  contact?: string; // contact person's name
  phone: string; // E.164
  createdAt?: string;
}
