/**
 * Admin-only client calls to the Cloud Functions backend.
 * setUserRole runs server-side (Admin SDK) and is rejected unless the caller
 * already holds the admin custom claim.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { UserRole } from '../types/user';

const functions = getFunctions(getApp());

export interface ProvisionInput {
  uid: string;
  role: UserRole;
  teamId: string;
  name?: string;
  managerId?: string | null;
}

/** Provision or update a crew member's role + team (sets their custom claim). */
export async function provisionUser(input: ProvisionInput): Promise<void> {
  const fn = httpsCallable(functions, 'setUserRole');
  await fn(input);
}
