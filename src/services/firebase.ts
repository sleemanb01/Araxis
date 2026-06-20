/**
 * Shared Firebase handles (modular RN Firebase API).
 *
 * Offline support: React Native Firebase Firestore enables on-device
 * persistence BY DEFAULT. Subscribed data (e.g. a technician's assigned jobs)
 * is cached locally and served from cache when offline; writes made offline
 * are queued and synced automatically once connectivity returns. No extra
 * configuration is required for Step 3's offline requirement.
 */
import { getApp } from '@react-native-firebase/app';
import { getFirestore } from '@react-native-firebase/firestore';

export const db = getFirestore(getApp());
