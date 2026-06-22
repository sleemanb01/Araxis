/**
 * Open a street address in the user's preferred navigation app (Waze or
 * Google Maps). The first time, the user is asked which app to use and the
 * choice is saved as the default (AsyncStorage) for every tap after that.
 */
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'mima:navApp';
export type NavApp = 'waze' | 'google';

function urlFor(app: NavApp, address: string): string {
  const q = encodeURIComponent(address);
  // Universal links: open the app if installed, else fall back to the website.
  return app === 'waze'
    ? `https://waze.com/ul?q=${q}&navigate=yes`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export async function getNavApp(): Promise<NavApp | null> {
  const v = await AsyncStorage.getItem(KEY);
  return v === 'waze' || v === 'google' ? v : null;
}

export async function setNavApp(app: NavApp): Promise<void> {
  await AsyncStorage.setItem(KEY, app);
}

async function open(app: NavApp, address: string): Promise<void> {
  try {
    await Linking.openURL(urlFor(app, address));
  } catch {
    Alert.alert('שגיאה', 'לא ניתן לפתוח אפליקציית ניווט.');
  }
}

/** Navigate to an address; prompts for the default nav app on first use. */
export async function navigateToAddress(address: string): Promise<void> {
  if (!address || !address.trim()) return;
  const saved = await getNavApp();
  if (saved) {
    open(saved, address);
    return;
  }
  Alert.alert('פתיחת ניווט', address, [
    {
      text: 'Waze',
      onPress: () => {
        setNavApp('waze');
        open('waze', address);
      },
    },
    {
      text: 'Google Maps',
      onPress: () => {
        setNavApp('google');
        open('google', address);
      },
    },
    { text: 'ביטול', style: 'cancel' },
  ]);
}
