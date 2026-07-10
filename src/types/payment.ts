/** A received payment on a job (serviceCalls/{id}/payments). Written ONLY by
 *  the backend (Morning documents are issued server-side; no API key in-app). */

export type PaymentMethod = 'cash' | 'bank_transfer' | 'credit_card' | 'check' | 'bit' | 'other';
export type PaymentStatus = 'pending' | 'issuing' | 'issued' | 'failed';
export type DocKind = 'receipt' | 'taxInvoiceReceipt';

export interface Payment {
  id: string;
  /** Owning job id (set on collection-group reads). */
  callId?: string;
  amount: number;
  method: PaymentMethod;
  date: string; // "YYYY-MM-DD"
  note?: string;
  docKind: DocKind;
  status: PaymentStatus;
  morningDocumentId?: string;
  morningDocumentNumber?: string;
  morningPdfUrl?: string;
  error?: string;
  createdAt: string;
}

export const PAYMENT_METHOD_HE: Record<PaymentMethod, string> = {
  cash: 'מזומן',
  bank_transfer: 'העברה בנקאית',
  credit_card: 'כרטיס אשראי',
  check: 'המחאה',
  bit: 'ביט',
  other: 'אחר',
};

export const DOC_KIND_HE: Record<DocKind, string> = {
  receipt: 'קבלה',
  taxInvoiceReceipt: 'חשבונית מס-קבלה',
};

export const PAYMENT_STATUS_HE: Record<PaymentStatus, string> = {
  pending: 'ממתין למסמך',
  issuing: 'מפיק מסמך…',
  issued: 'הופק',
  failed: 'נכשל',
};
