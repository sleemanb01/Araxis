/**
 * Araxis Cloud Functions — role management via Firebase custom claims.
 *
 * Firestore security rules gate on `request.auth.token.role`. Only this backend
 * (Admin SDK, which bypasses rules) may set a user's role, so a tech cannot
 * escalate their own privileges. The first admin per business is bootstrapped
 * out-of-band with scripts/set-admin.js.
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

type Role = 'admin' | 'lead_tech' | 'junior_tech';
const ROLES: Role[] = ['admin', 'lead_tech', 'junior_tech'];

interface SetUserRoleData {
  uid: string;
  role: Role;
  teamId: string;
  name?: string;
  managerId?: string | null;
}

/**
 * Admin-only: provision or update a crew member. Sets the role + teamId custom
 * claims (read by Firestore rules) and mirrors them into users/{uid}.
 * The target user must refresh their ID token — getIdToken(true) on the client —
 * to pick up the new claim.
 */
export const setUserRole = onCall(
  { region: 'me-west1' },
  async (request: CallableRequest<SetUserRoleData>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required.');
  }
  if (request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Admins only.');
  }

  const { uid, role, teamId, name, managerId } = request.data ?? ({} as SetUserRoleData);
  if (!uid || !ROLES.includes(role) || !teamId) {
    throw new HttpsError('invalid-argument', 'uid, a valid role, and teamId are required.');
  }

  await getAuth().setCustomUserClaims(uid, { role, teamId });

  await getFirestore()
    .collection('users')
    .doc(uid)
    .set(
      {
        uid,
        role,
        teamId,
        managerId: managerId ?? null,
        ...(name !== undefined ? { name } : {}),
      },
      { merge: true }
    );

  return { ok: true };
});
