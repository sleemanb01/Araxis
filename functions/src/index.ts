/**
 * Araxis Cloud Functions — capability-based access control.
 *
 * Each user's capabilities live in their Firebase custom claim (`caps`), set
 * only by this backend (Admin SDK, which bypasses rules) so a user can't grant
 * themselves access. Firestore rules read `request.auth.token.caps`.
 * The first admin per project is bootstrapped with scripts/set-admin.js.
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { issueDocument, MorningEnv, MorningDocKind, DOC_TYPES } from './morning';

initializeApp();
const db = getFirestore();

// WhatsApp Business (Meta Cloud API) config. TOKEN + PHONE_ID are secrets:
//   firebase functions:secrets:set WHATSAPP_TOKEN
//   firebase functions:secrets:set WHATSAPP_PHONE_ID
const WHATSAPP_TOKEN = defineSecret('WHATSAPP_TOKEN');
const WHATSAPP_PHONE_ID = defineSecret('WHATSAPP_PHONE_ID');
const WHATSAPP_TEMPLATE = defineString('WHATSAPP_TEMPLATE', { default: 'appointment_reminder' });
const WHATSAPP_LANG = defineString('WHATSAPP_LANG', { default: 'he' });

// Morning (Green Invoice) credentials — Secret Manager only, never the client:
//   firebase functions:secrets:set MORNING_API_KEY
//   firebase functions:secrets:set MORNING_API_SECRET
const MORNING_API_KEY = defineSecret('MORNING_API_KEY');
const MORNING_API_SECRET = defineSecret('MORNING_API_SECRET');
const MORNING_ENV = defineString('MORNING_ENV', { default: 'sandbox' });

const CAP_KEYS = [
  'manageCrew',
  'createCalls',
  'viewAllCalls',
  'viewFinancials',
  'viewTeamPayouts',
  'manageInventory',
] as const;
type Capabilities = Record<(typeof CAP_KEYS)[number], boolean>;

function normalizeCaps(raw: any): Capabilities {
  const out = {} as Capabilities;
  for (const k of CAP_KEYS) out[k] = raw?.[k] === true;
  return out;
}

// ---------------------------------------------------------------------------
// Crews — a user can belong to many crews, each with its own manager and
// per-member capabilities. A user's effective caps (the custom claim) are the
// UNION of their caps across every crew. Crews are mutated only here.
// ---------------------------------------------------------------------------

function unionCaps(a: Capabilities, b: Capabilities): Capabilities {
  const out = {} as Capabilities;
  for (const k of CAP_KEYS) out[k] = a[k] === true || b[k] === true;
  return out;
}

/** Recompute a user's union caps across all their crews; sync claim + user doc. */
async function recomputeUserClaim(uid: string): Promise<void> {
  const snap = await db.collection('crews').where('memberIds', 'array-contains', uid).get();
  let caps = normalizeCaps(null); // all false
  const crewIds: string[] = [];
  for (const c of snap.docs) {
    crewIds.push(c.id);
    const m = (c.data().members ?? {})[uid];
    if (m) caps = unionCaps(caps, normalizeCaps(m));
  }
  await getAuth().setCustomUserClaims(uid, { caps, crewIds });
  await db.collection('users').doc(uid).set({ caps, crewIds }, { merge: true });
}

/** Create a crew. Caller must hold `manageCrew`; they become its manager with
 *  their current caps. */
export const createCrew = onCall(
  { region: 'me-west1' },
  async (request: CallableRequest<{ name: string }>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const callerCaps = (request.auth.token as any).caps;
    if (!callerCaps || callerCaps.manageCrew !== true) {
      throw new HttpsError('permission-denied', 'Requires crew-management permission.');
    }
    const name = (request.data?.name ?? '').trim();
    if (!name) throw new HttpsError('invalid-argument', 'name is required.');

    const uid = request.auth.uid;
    const crewRef = db.collection('crews').doc();
    await crewRef.set({
      name,
      manager: uid,
      members: { [uid]: normalizeCaps(callerCaps) },
      memberIds: [uid],
      createdAt: new Date().toISOString(),
    });
    await recomputeUserClaim(uid);
    return { ok: true, crewId: crewRef.id };
  }
);

/** Set a member's caps within a crew. Caller must be the crew's manager and can
 *  only grant capabilities they themselves hold (inheritance). */
export const setCrewMemberCaps = onCall(
  { region: 'me-west1' },
  async (
    request: CallableRequest<{ crewId: string; uid: string; caps: Partial<Capabilities> }>
  ) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { crewId, uid, caps } = request.data ?? ({} as any);
    if (!crewId || !uid) {
      throw new HttpsError('invalid-argument', 'crewId and uid are required.');
    }

    const crewRef = db.collection('crews').doc(crewId);
    const crewSnap = await crewRef.get();
    if (!crewSnap.exists) throw new HttpsError('not-found', 'Crew not found.');
    if (crewSnap.data()!.manager !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the crew manager can set member capabilities.');
    }

    const callerCaps = normalizeCaps((request.auth.token as any).caps);
    const requested = normalizeCaps(caps);
    for (const k of CAP_KEYS) {
      if (requested[k] && !callerCaps[k]) {
        throw new HttpsError('permission-denied', 'You cannot grant a capability you do not have.');
      }
    }

    await crewRef.update({
      [`members.${uid}`]: requested,
      memberIds: FieldValue.arrayUnion(uid),
    });
    await recomputeUserClaim(uid);
    return { ok: true };
  }
);

/** Remove a member from a crew. Caller must be the manager; the manager can't be
 *  removed. The member's claim is recomputed from their remaining crews. */
export const removeCrewMember = onCall(
  { region: 'me-west1' },
  async (request: CallableRequest<{ crewId: string; uid: string }>) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
    const { crewId, uid } = request.data ?? ({} as any);
    if (!crewId || !uid) {
      throw new HttpsError('invalid-argument', 'crewId and uid are required.');
    }

    const crewRef = db.collection('crews').doc(crewId);
    const crewSnap = await crewRef.get();
    if (!crewSnap.exists) throw new HttpsError('not-found', 'Crew not found.');
    if (crewSnap.data()!.manager !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the crew manager can remove members.');
    }
    if (uid === request.auth.uid) {
      throw new HttpsError('failed-precondition', 'The manager cannot be removed.');
    }

    await crewRef.update({
      [`members.${uid}`]: FieldValue.delete(),
      memberIds: FieldValue.arrayRemove(uid),
    });
    await recomputeUserClaim(uid);
    return { ok: true };
  }
);

// ---------------------------------------------------------------------------
// Appointment reminders — daily at 09:00 (Asia/Jerusalem) a WhatsApp template
// message is sent (Meta Cloud API) to the contact phone of every appointment
// scheduled for TOMORROW. Needs the WHATSAPP_TOKEN / WHATSAPP_PHONE_ID secrets
// and an approved template (default "appointment_reminder", 3 body params:
// client name, date/time, address).
// ---------------------------------------------------------------------------

/** Jerusalem calendar date "YYYY-MM-DD" for an instant. */
function jslmDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Normalize an Israeli phone to international digits (e.g. "972501234567"). */
function toIntlPhone(raw: string): string | null {
  const s = (raw || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (s.startsWith('972')) return s || null;
  if (s.startsWith('0')) return '972' + s.slice(1);
  return s || null;
}

async function sendWhatsAppReminder(to: string, call: any): Promise<void> {
  const when = new Date(call.scheduledDate).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: WHATSAPP_TEMPLATE.value(),
      language: { code: WHATSAPP_LANG.value() },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(call.clientName || '') },
            { type: 'text', text: when },
            { type: 'text', text: String(call.address || '—') },
          ],
        },
      ],
    },
  };
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID.value()}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  }
}

export const sendAppointmentReminders = onSchedule(
  {
    schedule: 'every day 09:00',
    timeZone: 'Asia/Jerusalem',
    region: 'me-west1',
    secrets: [WHATSAPP_TOKEN, WHATSAPP_PHONE_ID],
  },
  async () => {
    // Generous UTC window, then keep only appointments whose Jerusalem calendar
    // day is tomorrow (robust to timezone/DST).
    const lo = new Date();
    lo.setUTCHours(0, 0, 0, 0);
    const hi = new Date(lo);
    hi.setUTCDate(hi.getUTCDate() + 3);
    const tomorrow = jslmDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

    const snap = await db
      .collection('serviceCalls')
      .where('scheduledDate', '>=', lo.toISOString())
      .where('scheduledDate', '<', hi.toISOString())
      .get();

    let sent = 0;
    for (const docSnap of snap.docs) {
      const c = docSnap.data() as any;
      if (!c.contactPhone || c.reminderSentAt || c.status === 'completed') continue;
      if (jslmDate(new Date(c.scheduledDate)) !== tomorrow) continue;
      const to = toIntlPhone(c.contactPhone);
      if (!to) continue;
      try {
        await sendWhatsAppReminder(to, c);
        await docSnap.ref.update({ reminderSentAt: new Date().toISOString() });
        sent++;
      } catch (e) {
        console.error('[reminder] failed for', docSnap.id, e);
      }
    }
    console.log(`[reminder] sent ${sent} reminder(s) for ${tomorrow}`);
  }
);

// ---------------------------------------------------------------------------
// Payments + Morning (Green Invoice) documents.
//
// A job's payments live at serviceCalls/{id}/payments/{pid}; each records the
// amount ACTUALLY received. Accounting documents are issued through Morning
// only for received amounts (never the full deal price when only a deposit was
// paid). paidAmount on privateData/financials is kept = sum of ISSUED payments,
// so every existing dashboard/profit computation stays correct.
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'credit_card', 'check', 'bit', 'other'] as const;

function requireFinancials(request: CallableRequest<any>): void {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required.');
  const caps = (request.auth.token as any).caps;
  if (!caps || caps.viewFinancials !== true) {
    throw new HttpsError('permission-denied', 'Requires financials permission.');
  }
}

/** Sum of payments by status for a call. */
async function paymentTotals(callId: string): Promise<{ issued: number; reserved: number }> {
  const snap = await db.collection('serviceCalls').doc(callId).collection('payments').get();
  let issued = 0;
  let reserved = 0; // issued + pending — reserved against the open balance
  for (const p of snap.docs) {
    const d = p.data();
    const amt = typeof d.amount === 'number' ? d.amount : 0;
    if (d.status === 'issued') issued += amt;
    if (d.status === 'issued' || d.status === 'pending') reserved += amt;
  }
  return { issued, reserved };
}

/** Recompute financials.paidAmount from issued payments. */
async function syncPaidAmount(callId: string): Promise<void> {
  const { issued } = await paymentTotals(callId);
  await db
    .collection('serviceCalls')
    .doc(callId)
    .collection('privateData')
    .doc('financials')
    .set({ paidAmount: issued }, { merge: true });
}

/** Issue the Morning document for one payment doc and stamp the result. */
async function issueForPayment(callId: string, paymentId: string): Promise<any> {
  const callRef = db.collection('serviceCalls').doc(callId);
  const payRef = callRef.collection('payments').doc(paymentId);
  const [callSnap, paySnap] = await Promise.all([callRef.get(), payRef.get()]);
  if (!callSnap.exists) throw new HttpsError('not-found', 'Job not found.');
  if (!paySnap.exists) throw new HttpsError('not-found', 'Payment not found.');
  const call = callSnap.data() as any;
  const pay = paySnap.data() as any;
  if (pay.status === 'issued') throw new HttpsError('failed-precondition', 'Document already issued.');

  try {
    const doc = await issueDocument(
      MORNING_ENV.value() as MorningEnv,
      MORNING_API_KEY.value(),
      MORNING_API_SECRET.value(),
      {
        kind: (pay.docKind ?? 'receipt') as MorningDocKind,
        amount: pay.amount,
        method: pay.method,
        date: pay.date,
        description: pay.note || 'שירות והתקנה',
        clientName: call.clientName ?? '',
        clientPhone: call.contactPhone || undefined,
      }
    );
    await payRef.set(
      {
        status: 'issued',
        morningDocumentId: doc.id,
        morningDocumentNumber: doc.number,
        morningDocumentType: doc.type,
        morningPdfUrl: doc.pdfUrl,
        error: FieldValue.delete(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await syncPaidAmount(callId);
    return { ok: true, document: doc };
  } catch (e: any) {
    await payRef.set(
      { status: 'failed', error: String(e?.message ?? e), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    throw new HttpsError('internal', `Morning: ${e?.message ?? e}`);
  }
}

/** Add a (possibly partial) payment to a job; optionally issue its document now. */
export const addJobPayment = onCall(
  { region: 'me-west1', secrets: [MORNING_API_KEY, MORNING_API_SECRET] },
  async (
    request: CallableRequest<{
      callId: string;
      amount: number;
      method: string;
      date?: string;   // "YYYY-MM-DD" (default today)
      note?: string;
      issueNow?: boolean;
      docKind?: MorningDocKind;
    }>
  ) => {
    requireFinancials(request);
    const { callId, method, note, issueNow } = request.data ?? ({} as any);
    const amount = Math.round((Number(request.data?.amount) || 0) * 100) / 100;
    const docKind: MorningDocKind =
      request.data?.docKind && request.data.docKind in DOC_TYPES ? request.data.docKind : 'receipt';
    if (!callId) throw new HttpsError('invalid-argument', 'callId is required.');
    if (amount <= 0) throw new HttpsError('invalid-argument', 'amount must be positive.');
    if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
      throw new HttpsError('invalid-argument', 'invalid payment method.');
    }

    const callRef = db.collection('serviceCalls').doc(callId);
    const [callSnap, finSnap, totals] = await Promise.all([
      callRef.get(),
      callRef.collection('privateData').doc('financials').get(),
      paymentTotals(callId),
    ]);
    if (!callSnap.exists) throw new HttpsError('not-found', 'Job not found.');

    // Never allow recording more than the open balance of the deal.
    const total = (finSnap.data() as any)?.overallPrice ?? 0;
    if (total > 0 && totals.reserved + amount > total + 0.005) {
      throw new HttpsError(
        'failed-precondition',
        `Payment exceeds the open balance (${Math.max(0, total - totals.reserved)} ILS left).`
      );
    }

    const date = request.data?.date || new Date().toISOString().slice(0, 10);
    const payRef = callRef.collection('payments').doc();
    await payRef.set({
      amount,
      method,
      date,
      note: note || '',
      docKind,
      status: 'pending',
      createdBy: request.auth!.uid,
      createdAt: new Date().toISOString(),
    });

    if (issueNow) {
      const res = await issueForPayment(callId, payRef.id);
      return { ok: true, paymentId: payRef.id, ...res };
    }
    return { ok: true, paymentId: payRef.id };
  }
);

/** Issue (or retry) the Morning document for an existing payment. */
export const issuePaymentDocument = onCall(
  { region: 'me-west1', secrets: [MORNING_API_KEY, MORNING_API_SECRET] },
  async (request: CallableRequest<{ callId: string; paymentId: string }>) => {
    requireFinancials(request);
    const { callId, paymentId } = request.data ?? ({} as any);
    if (!callId || !paymentId) {
      throw new HttpsError('invalid-argument', 'callId and paymentId are required.');
    }
    return issueForPayment(callId, paymentId);
  }
);
