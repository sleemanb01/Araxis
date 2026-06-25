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
