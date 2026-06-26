/**
 * Admin client calls to the Cloud Functions backend. Crew mutations run
 * server-side (Admin SDK) so they can set custom claims; they enforce that the
 * caller is the crew's manager and can only grant caps the manager holds.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { Capabilities } from '../types/user';

const functions = getFunctions(getApp(), 'me-west1');

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
