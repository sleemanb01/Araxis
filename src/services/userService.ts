/**
 * User profile service — Firestore "users" collection (keyed by auth uid),
 * plus logo upload to Firebase Storage. Modular RN Firebase API.
 */

import { doc, getDoc, setDoc, onSnapshot } from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { getStorage, ref, putFile, getDownloadURL } from '@react-native-firebase/storage';
import { db } from './firebase';
import { UserProfile } from '../types/user';

const USERS = 'users';

/** Realtime subscription to the signed-in user's profile (null if none yet). */
export function subscribeToProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    doc(db, USERS, uid),
    (snap) => {
      const data = snap.data();
      onChange(data ? (data as UserProfile) : null);
    },
    (err) => {
      console.warn('[profile] listener error:', err);
      onError?.(err as Error);
    }
  );
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS, uid));
  const data = snap.data();
  return data ? (data as UserProfile) : null;
}

export async function createProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, USERS, profile.uid), profile);
}

/** Upload a local image (file:// uri) as the provider's logo; returns its URL. */
export async function uploadLogo(uid: string, localUri: string): Promise<string> {
  const storage = getStorage(getApp());
  const storageRef = ref(storage, `logos/${uid}.jpg`);
  await putFile(storageRef, localUri);
  return getDownloadURL(storageRef);
}
