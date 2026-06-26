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
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { UserProfile, Availability, toCaps, NO_CAPS } from '../types/user';

const USERS = 'users';

function toUser(snap: { id: string; data: () => any }): UserProfile {
  const d = snap.data();
  return {
    uid: snap.id,
    name: d.name ?? '',
    caps: toCaps(d.caps),
    teamId: d.teamId ?? '',
    services: Array.isArray(d.services) ? d.services : [],
    availability: d.availability ?? undefined,
    navApp: d.navApp === 'waze' || d.navApp === 'google' ? d.navApp : undefined,
    phone: d.phone ?? undefined,
    createdAt: d.createdAt ?? undefined,
  };
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
  opts?: { phone?: string; services?: string[]; availability?: Availability }
): Promise<void> {
  await setDoc(doc(db, USERS, uid), {
    uid,
    name,
    caps: NO_CAPS, // no access until an admin provisions capabilities (+ claim)
    teamId: '',
    ...(opts?.phone ? { phone: opts.phone } : {}),
    ...(opts?.services?.length ? { services: opts.services } : {}),
    ...(opts?.availability ? { availability: opts.availability } : {}),
    createdAt: new Date().toISOString(),
  });
}

/** Resolve a set of users by uid (chunked `in` queries). Used to show only a
 *  crew's own members, rather than reading the whole users collection. */
export async function getUsersByIds(ids: string[]): Promise<UserProfile[]> {
  const out: UserProfile[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    if (!chunk.length) continue;
    const snap = await getDocs(query(collection(db, USERS), where('uid', 'in', chunk)));
    snap.forEach((d) => out.push(toUser(d)));
  }
  return out;
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
