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

/** Open turn-by-turn navigation to an address (Google/Apple Maps). */
export function openMaps(address: string) {
  const q = encodeURIComponent(address);
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`).catch(() =>
    Alert.alert('שגיאה', 'לא ניתן לפתוח ניווט.')
  );
}
