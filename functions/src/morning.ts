/**
 * morningService — ALL Morning (Green Invoice) API logic lives here, backend
 * only. API credentials come from Secret Manager (never the client app):
 *   firebase functions:secrets:set MORNING_API_KEY
 *   firebase functions:secrets:set MORNING_API_SECRET
 * Environment via the MORNING_ENV param: 'sandbox' (default) | 'production'.
 */

const BASE_URLS = {
  sandbox: 'https://sandbox.d.greeninvoice.co.il/api/v1',
  production: 'https://api.greeninvoice.co.il/api/v1',
} as const;
export type MorningEnv = keyof typeof BASE_URLS;

/** Morning document types we issue. */
export const DOC_TYPES = {
  receipt: 400,            // קבלה
  taxInvoiceReceipt: 320,  // חשבונית מס-קבלה
} as const;
export type MorningDocKind = keyof typeof DOC_TYPES;

/** App payment method -> Morning payment-row type code.
 *  (Codes per Green Invoice API; verify once in sandbox.) */
const PAYMENT_TYPE_CODES: Record<string, number> = {
  cash: 1,
  check: 2,
  credit_card: 3,
  bank_transfer: 4,
  bit: 10, // payment app
  other: 11,
};

interface TokenCache {
  token: string;
  expiresAt: number;
}
let cachedToken: TokenCache | null = null;

async function getToken(env: MorningEnv, apiKey: string, apiSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const res = await fetch(`${BASE_URLS[env]}/account/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: apiKey, secret: apiSecret }),
  });
  if (!res.ok) throw new Error(`Morning auth ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as any;
  cachedToken = { token: data.token, expiresAt: (data.expires ?? 0) * 1000 };
  return data.token;
}

export interface IssueDocumentInput {
  kind: MorningDocKind;
  amount: number;            // the amount ACTUALLY received (gross, ILS)
  method: string;            // app payment method key
  date: string;              // "YYYY-MM-DD"
  description: string;       // income row description
  clientName: string;
  clientPhone?: string;
  remarks?: string;
}

export interface IssuedDocument {
  id: string;
  number: string;
  type: number;
  pdfUrl: string | null;
}

/** Create an accounting document in Morning for a received payment. */
export async function issueDocument(
  env: MorningEnv,
  apiKey: string,
  apiSecret: string,
  input: IssueDocumentInput
): Promise<IssuedDocument> {
  const token = await getToken(env, apiKey, apiSecret);
  const type = DOC_TYPES[input.kind];
  const amount = Math.round(input.amount * 100) / 100;

  const payment = [
    {
      date: input.date,
      type: PAYMENT_TYPE_CODES[input.method] ?? PAYMENT_TYPE_CODES.other,
      price: amount,
      currency: 'ILS',
    },
  ];
  const body: any = {
    type,
    lang: 'he',
    currency: 'ILS',
    remarks: input.remarks || undefined,
    client: {
      name: input.clientName || 'לקוח',
      phone: input.clientPhone || undefined,
      add: true, // auto-create the client in Morning if new
    },
    payment,
  };
  // A tax invoice-receipt carries income rows equal to the payment; a plain
  // receipt is payment rows only.
  if (input.kind === 'taxInvoiceReceipt') {
    body.income = [
      {
        description: input.description || 'שירות והתקנה',
        quantity: 1,
        price: amount,       // gross — VAT included
        currency: 'ILS',
        vatType: 1,          // price includes VAT
      },
    ];
  }

  const res = await fetch(`${BASE_URLS[env]}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Morning document ${res.status}: ${await res.text()}`);
  const doc = (await res.json()) as any;
  return {
    id: String(doc.id ?? ''),
    number: String(doc.number ?? ''),
    type,
    pdfUrl: doc.url?.he ?? doc.url?.origin ?? null,
  };
}
