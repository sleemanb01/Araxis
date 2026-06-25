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

/** Create a crew; the caller becomes its manager. Returns the new crew id. */
export async function createCrew(name: string): Promise<string> {
  const fn = httpsCallable(functions, 'createCrew');
  const res = await fn({ name });
  return (res.data as any)?.crewId ?? '';
}

/** Set a member's caps within a crew (manager only; limited to your own caps). */
export async function setCrewMemberCaps(input: {
  crewId: string;
  uid: string;
  caps: Capabilities;
}): Promise<void> {
  const fn = httpsCallable(functions, 'setCrewMemberCaps');
  await fn(input);
}

/** Remove a member from a crew (manager only). */
export async function removeCrewFromMember(input: {
  crewId: string;
  uid: string;
}): Promise<void> {
  const fn = httpsCallable(functions, 'removeCrewMember');
  await fn(input);
}
