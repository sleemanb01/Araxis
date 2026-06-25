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
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

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

/**
 * Remove a crew member from the crew. Caller must hold `manageCrew` and cannot
 * remove themselves. Revokes their capability claim (so they lose access and
 * revert to a pending, unprovisioned state) and deletes their users/{uid} crew
 * profile. The Auth account is KEPT — the person isn't deleted and can sign in
 * again or be re-added to the crew later.
 */
export const removeUser = onCall(
  { region: 'me-west1' },
  async (request: CallableRequest<{ uid: string }>) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }
    const callerCaps = (request.auth.token as any).caps;
    if (!callerCaps || callerCaps.manageCrew !== true) {
      throw new HttpsError('permission-denied', 'Requires crew-management permission.');
    }

    const { uid } = request.data ?? ({} as { uid: string });
    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid is required.');
    }
    if (uid === request.auth.uid) {
      throw new HttpsError('failed-precondition', 'You cannot remove yourself.');
    }

    // Revoke access (clear the claim), then drop the crew profile doc.
    // The Auth account is intentionally left intact — this removes them from the
    // crew, it does not delete the user.
    await getAuth().setCustomUserClaims(uid, null);
    await getFirestore().collection('users').doc(uid).delete();

    return { ok: true };
  }
);
