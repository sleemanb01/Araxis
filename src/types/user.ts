/** Per-user capabilities — the access primitives. Mirrored into the Firebase
 *  custom claim (`caps`) so Firestore rules enforce them server-side. */
export interface Capabilities {
  manageCrew: boolean;       // add/edit/remove crew + set their capabilities
  createCalls: boolean;      // create service calls
  viewAllCalls: boolean;     // see every call (off → only calls you're on)
  viewFinancials: boolean;   // see/edit client price & profit (the wall)
  viewTeamPayouts: boolean;  // see all payout splits (off → only your own)
  manageInventory: boolean;  // edit inventory + vehicle transfers
}

export const CAP_KEYS: (keyof Capabilities)[] = [
  'manageCrew',
  'createCalls',
  'viewAllCalls',
  'viewFinancials',
  'viewTeamPayouts',
  'manageInventory',
];

export const CAP_LABELS_HE: Record<keyof Capabilities, string> = {
  manageCrew: 'ניהול צוות',
  createCalls: 'יצירת קריאות שירות',
  viewAllCalls: 'צפייה בכל הקריאות',
  viewFinancials: 'צפייה בכספים',
  viewTeamPayouts: 'צפייה בתשלומי הצוות',
  manageInventory: 'ניהול מלאי',
};

export const NO_CAPS: Capabilities = {
  manageCrew: false,
  createCalls: false,
  viewAllCalls: false,
  viewFinancials: false,
  viewTeamPayouts: false,
  manageInventory: false,
};

export const ALL_CAPS: Capabilities = {
  manageCrew: true,
  createCalls: true,
  viewAllCalls: true,
  viewFinancials: true,
  viewTeamPayouts: true,
  manageInventory: true,
};

/** Coerce arbitrary data into a strict Capabilities object (all booleans). */
export function toCaps(raw: any): Capabilities {
  const c = raw ?? {};
  return {
    manageCrew: c.manageCrew === true,
    createCalls: c.createCalls === true,
    viewAllCalls: c.viewAllCalls === true,
    viewFinancials: c.viewFinancials === true,
    viewTeamPayouts: c.viewTeamPayouts === true,
    manageInventory: c.manageInventory === true,
  };
}

/** Short display label derived from capabilities (for lists/profile). */
export function capsLabel(c: Capabilities | null | undefined): string {
  if (!c) return '—';
  if (c.manageCrew) return 'מנהל';
  if (c.viewAllCalls || c.viewFinancials) return 'ראש צוות';
  return 'טכנאי';
}

/** Working availability: which days, and the daily time window. */
export interface Availability {
  days: number[]; // 0=Sunday … 6=Saturday
  from: string;   // 'HH:MM'
  to: string;     // 'HH:MM'
}

export interface UserProfile {
  uid: string;
  name: string;
  caps: Capabilities;
  teamId: string;
  services?: string[];       // service names this user provides (open catalog)
  availability?: Availability;
  navApp?: 'waze' | 'google'; // preferred navigation app (remembered)
  phone?: string;            // E.164, captured at self-registration (admin lookup)
  createdAt?: string;        // ISO date string
}
