/**
 * Admin client calls to the Cloud Functions backend. setUserCaps runs
 * server-side (Admin SDK) and is rejected unless the caller holds the
 * `manageCrew` capability in their custom claim.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Capabilities } from '../types/user';

const functions = getFunctions(getApp(), 'me-west1');

export interface SetCapsInput {
  uid: string;
  caps: Capabilities;
  teamId: string;
  name?: string;
}

/** Set a crew member's capabilities + team (writes their doc and custom claim). */
export async function setUserCaps(input: SetCapsInput): Promise<void> {
  const fn = httpsCallable(functions, 'setUserCaps');
  await fn(input);
}

/** Remove a crew member: revokes their claim, deletes their doc and Auth account. */
export async function removeUser(uid: string): Promise<void> {
  const fn = httpsCallable(functions, 'removeUser');
  await fn({ uid });
}
