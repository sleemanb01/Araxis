/** Phone + WhatsApp deep links for contacting a customer. */
import { Linking } from 'react-native';

export function callNumber(phone: string): void {
  if (!phone) return;
  Linking.openURL(`tel:${phone}`);
}

/** Normalize an Israeli/local number to international digits (no '+') for wa.me. */
function toIntlDigits(phone: string): string {
  const d = phone.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d.slice(1);
  if (d.startsWith('972')) return d;
  if (d.startsWith('0')) return '972' + d.slice(1);
  return '972' + d;
}

export function openWhatsApp(phone: string): void {
  if (!phone) return;
  Linking.openURL(`https://wa.me/${toIntlDigits(phone)}`);
}
