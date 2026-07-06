/**
 * Israeli small-business (עוסק מורשה, self-employed owner) tax math — VAT,
 * income tax and National Insurance — computed on a MONTHLY basis.
 *
 * Model & assumptions (documented so they can be tuned in one place):
 *  - All prices in the app INCLUDE VAT (client price, equipment cost, general
 *    expenses); crew payouts are wages — no VAT.
 *  - VAT payable = (sales − VAT-bearing inputs) × RATE/(1+RATE)  (can be
 *    negative → input-credit month).
 *  - Taxable income (pre-tax), per the owner's bookkeeping convention:
 *    revenue − expenses − equipment/(1+VAT) − crew wages.
 *  - Income tax: 2025 annual brackets ÷ 12, minus the resident credit points.
 *  - National Insurance (self-employed, incl. health): reduced rate up to the
 *    lower tier, full rate up to the ceiling.
 *  - Approximations: monthly slicing of annual brackets, default 2.25 credit
 *    points, no pension/deduction fine-tuning. Update the constants yearly.
 */

export const VAT_RATE = 0.18; // מע״מ 18% (since 2025)

// Income tax — MONTHLY brackets (2025 annual ÷ 12): [upper bound, rate].
const IT_BRACKETS: Array<[number, number]> = [
  [7010, 0.10],
  [10060, 0.14],
  [16150, 0.20],
  [22440, 0.31],
  [46690, 0.35],
  [Infinity, 0.47],
];
const CREDIT_POINTS = 2.25; // resident default
const CREDIT_POINT_MONTHLY = 242; // ₪ per point per month (2025)

// National Insurance + health, self-employed (2025, monthly).
const NI_TIER1_CAP = 7522; // 60% of the average wage
const NI_CEILING = 50695; // income above this is exempt
const NI_LOW = 0.0597; // 2.87% NI + 3.10% health
const NI_HIGH = 0.1783; // 12.83% NI + 5.00% health

export interface TaxBreakdown {
  vat: number; // מע״מ לתשלום (net of input credits; may be negative)
  preTax: number; // הכנסה חייבת (net of VAT and costs)
  incomeTax: number; // מס הכנסה
  nationalInsurance: number; // ביטוח לאומי + בריאות
  net: number; // רווח נקי אחרי הכל
}

const exVat = (gross: number) => gross / (1 + VAT_RATE);

function incomeTaxMonthly(income: number): number {
  if (income <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of IT_BRACKETS) {
    if (income <= prev) break;
    tax += (Math.min(income, cap) - prev) * rate;
    prev = cap;
  }
  return Math.max(0, tax - CREDIT_POINTS * CREDIT_POINT_MONTHLY);
}

function nationalInsuranceMonthly(income: number): number {
  if (income <= 0) return 0;
  const capped = Math.min(income, NI_CEILING);
  const low = Math.min(capped, NI_TIER1_CAP) * NI_LOW;
  const high = Math.max(0, capped - NI_TIER1_CAP) * NI_HIGH;
  return low + high;
}

/** Full monthly breakdown from the month's gross (VAT-inclusive) components. */
export function monthlyTaxes(input: {
  revenue: number; // client prices billed this month (incl. VAT)
  equipment: number; // equipment cost (incl. VAT)
  crew: number; // crew payouts (wages, no VAT)
  expenses: number; // general expenses (incl. VAT)
}): TaxBreakdown {
  const vat = (input.revenue - input.equipment - input.expenses) * (VAT_RATE / (1 + VAT_RATE));
  // Owner's convention: revenue and expenses at face value; only the equipment
  // cost is VAT-stripped; crew wages carry no VAT.
  const preTax = input.revenue - input.expenses - exVat(input.equipment) - input.crew;
  const incomeTax = incomeTaxMonthly(preTax);
  const nationalInsurance = nationalInsuranceMonthly(preTax);
  return { vat, preTax, incomeTax, nationalInsurance, net: preTax - incomeTax - nationalInsurance };
}

/** Share of pre-tax income taken by income tax + NI this month (0..1). */
export function directTaxRate(b: TaxBreakdown): number {
  return b.preTax > 0 ? (b.incomeTax + b.nationalInsurance) / b.preTax : 0;
}
