import { Alert, Linking } from 'react-native';

/** Open the phone dialer for a number (E.164 or local). */
export function dialPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('שגיאה', 'לא ניתן לחייג.'));
}

/** Open a WhatsApp chat with a number. https://wa.me wants digits only. */
export function openWhatsapp(phone: string) {
  const digits = phone.replace(/\D/g, '');
  Linking.openURL(`https://wa.me/${digits}`).catch(() =>
    Alert.alert('שגיאה', 'לא ניתן לפתוח את וואטסאפ.')
  );
}

export type NavApp = 'waze' | 'google';

function navUrl(app: NavApp, address: string): string {
  const q = encodeURIComponent(address);
  return app === 'waze'
    ? `https://waze.com/ul?q=${q}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

/**
 * Navigate to an address. Uses the saved app if `current` is set; otherwise asks
 * (Waze / Google Maps) and reports the pick via onChoose so it can be persisted
 * as the default.
 */
export function openNavigation(
  address: string,
  current: NavApp | undefined,
  onChoose: (app: NavApp) => void
) {
  const go = (app: NavApp) =>
    Linking.openURL(navUrl(app, address)).catch(() => Alert.alert('שגיאה', 'לא ניתן לפתוח ניווט.'));
  if (current === 'waze' || current === 'google') {
    go(current);
    return;
  }
  Alert.alert('בחר אפליקציית ניווט', 'הבחירה תישמר כברירת מחדל', [
    { text: 'Waze', onPress: () => { onChoose('waze'); go('waze'); } },
    { text: 'Google Maps', onPress: () => { onChoose('google'); go('google'); } },
    { text: 'ביטול', style: 'cancel' },
  ]);
}
