/** A supplier contact (collection `suppliers`). */
export interface Supplier {
  id: string;
  name: string;
  phone: string; // E.164
  createdAt?: string;
}
