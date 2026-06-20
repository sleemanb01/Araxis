/**
 * Shared Firebase handles (modular RN Firebase API).
 */
import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';

export const db = getFirestore(getApp());
