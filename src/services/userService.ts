/**
 * User profile service — Firestore "users" collection (keyed by auth uid).
 * Roles are mirrored into Firebase custom claims by the Cloud Function in
 * functions/ (Stage 3); this service only manages the user documents.
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  arrayRemove,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { UserProfile, toCaps, NO_CAPS } from '../types/user';

const USERS = 'users';

function toUser(snap: { id: string; data: () => any }): UserProfile {
  const d = snap.data();
  return {
    uid: snap.id,
    name: d.name ?? '',
    caps: toCaps(d.caps),
    managerId: d.managerId ?? null,
    teamId: d.teamId ?? '',
    crew: Array.isArray(d.crew) ? d.crew : [],
    phone: d.phone ?? undefined,
    createdAt: d.createdAt ?? undefined,
  };
}

/** Add a member (by uid) to a manager's crew roster. Member's own doc untouched. */
export async function addCrewMember(managerUid: string, memberUid: string): Promise<void> {
  await updateDoc(doc(db, USERS, managerUid), { crew: arrayUnion(memberUid) });
}

/** Remove a member (by uid) from a manager's crew roster. Does NOT delete the
 *  member — only pulls their uid out of the manager's `crew` array. */
export async function removeCrewMember(managerUid: string, memberUid: string): Promise<void> {
  await updateDoc(doc(db, USERS, managerUid), { crew: arrayRemove(memberUid) });
}

/** Realtime subscription to one user's profile (null until provisioned). */
export function subscribeToProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, USERS, uid),
    (snap) => onChange(snap.data() ? toUser(snap) : null),
    (err) => {
      console.warn('[profile] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  return snap.data() ? toUser(snap) : null;
}

export async function createProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, USERS, profile.uid), {
    ...profile,
    createdAt: profile.createdAt ?? new Date().toISOString(),
  });
}

export async function updateProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), data as { [k: string]: any });
}

/**
 * Self-register a pending profile after first sign-in. No role claim is granted
 * here (rules only allow the placeholder below); an admin provisions the real
 * role via the setUserRole Cloud Function.
 */
export async function createPendingProfile(
  uid: string,
  name: string,
  phone?: string
): Promise<void> {
  await setDoc(doc(db, USERS, uid), {
    uid,
    name,
    caps: NO_CAPS, // no access until an admin provisions capabilities (+ claim)
    teamId: '',
    managerId: null,
    ...(phone ? { phone } : {}),
    createdAt: new Date().toISOString(),
  });
}

/** Find a crew member by phone (E.164). Admin-only lookup used for provisioning. */
export async function findUserByPhone(phone: string): Promise<UserProfile | null> {
  const snap = await getDocs(query(collection(db, USERS), where('phone', '==', phone)));
  return snap.empty ? null : toUser(snap.docs[0]);
}

export async function deleteUserDoc(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS, uid));
}

/** All crew members — the admin uses this to provision and assign techs. */
export function subscribeToUsers(
  onChange: (users: UserProfile[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    collection(db, USERS),
    (snap) => onChange(snap.docs.map(toUser)),
    (err) => {
      console.warn('[users] listener error:', err);
      onError?.(err as Error);
    }
  );
}
