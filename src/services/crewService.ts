/**
 * Crew service — reads from the "crews" collection. Writes (create crew, set a
 * member's caps, remove a member) go through Cloud Functions in adminService,
 * because they also recompute the affected user's custom claim (union of caps).
 * Modular RN Firebase API.
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { db } from './firebase';
import { Crew } from '../types/crew';
import { Capabilities, toCaps } from '../types/user';

const CREWS = 'crews';

function toCrew(snap: { id: string; data: () => any }): Crew {
  const d = snap.data();
  const raw = d.members && typeof d.members === 'object' ? d.members : {};
  const members: Record<string, Capabilities> = {};
  for (const uid of Object.keys(raw)) members[uid] = toCaps(raw[uid]);
  return {
    id: snap.id,
    name: d.name ?? '',
    manager: d.manager ?? '',
    members,
    memberIds: Array.isArray(d.memberIds) ? d.memberIds : Object.keys(members),
    createdAt: d.createdAt ?? undefined,
  };
}

/** Realtime subscription to the crews a user belongs to (member or manager). */
export function subscribeToMyCrews(
  uid: string,
  onChange: (crews: Crew[]) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    query(collection(db, CREWS), where('memberIds', 'array-contains', uid)),
    (snap) => onChange(snap.docs.map(toCrew)),
    (err) => {
      console.warn('[crews] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function getCrew(crewId: string): Promise<Crew | null> {
  const snap = await getDoc(doc(db, CREWS, crewId));
  return snap.data() ? toCrew(snap) : null;
}
