/**
 * Araxis Cloud Functions — capability-based access control.
 *
 * Each user's capabilities live in their Firebase custom claim (`caps`), set
 * only by this backend (Admin SDK, which bypasses rules) so a user can't grant
 * themselves access. Firestore rules read `request.auth.token.caps`.
 * The first admin per project is bootstrapped with scripts/set-admin.js.
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const CAP_KEYS = [
  'manageCrew',
  'createCalls',
  'viewAllCalls',
  'viewFinancials',
  'viewTeamPayouts',
  'manageInventory',
] as const;
type Capabilities = Record<(typeof CAP_KEYS)[number], boolean>;

interface SetCapsData {
  uid: string;
  caps: Partial<Capabilities>;
  teamId: string;
  name?: string;
}

function normalizeCaps(raw: any): Capabilities {
  const out = {} as Capabilities;
  for (const k of CAP_KEYS) out[k] = raw?.[k] === true;
  return out;
}

/**
 * Set a crew member's capabilities + team. Caller must hold `manageCrew`.
 * Sets the target's custom claim (read by rules) and mirrors to users/{uid}.
 * The target refreshes their ID token (getIdTokenResult(user, true)) to pick it up.
 */
export const setUserCaps = onCall(
  { region: 'me-west1' },
  async (request: CallableRequest<SetCapsData>) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const callerCaps = (request.auth.token as any).caps;
    if (!callerCaps || callerCaps.manageCrew !== true) {
      throw new HttpsError('permission-denied', 'Requires crew-management permission.');
    }

    const { uid, caps, teamId, name } = request.data ?? ({} as SetCapsData);
    if (!uid || !teamId) {
      throw new HttpsError('invalid-argument', 'uid and teamId are required.');
    }

    const next = normalizeCaps(caps);

    // Prevent self-lockout: you cannot remove your own crew-management access.
    if (uid === request.auth.uid && next.manageCrew !== true) {
      throw new HttpsError(
        'failed-precondition',
        'You cannot remove your own crew-management capability.'
      );
    }

    await getAuth().setCustomUserClaims(uid, { caps: next, teamId });
    await getFirestore()
      .collection('users')
      .doc(uid)
      .set(
        { uid, caps: next, teamId, ...(name !== undefined ? { name } : {}) },
        { merge: true }
      );

    return { ok: true };
  }
);

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
