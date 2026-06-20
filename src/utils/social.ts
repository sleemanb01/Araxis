export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'whatsapp';

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'tiktok',
  'whatsapp',
];

interface SocialMeta {
  label: string;
  icon: string;   // FontAwesome5 brand icon name
  color: string;  // brand color
  placeholder: string;
}

export const SOCIAL_META: Record<SocialPlatform, SocialMeta> = {
  instagram: { label: 'אינסטגרם', icon: 'instagram', color: '#E4405F', placeholder: '@username' },
  facebook:  { label: 'פייסבוק',  icon: 'facebook',  color: '#1877F2', placeholder: '@username' },
  tiktok:    { label: 'טיקטוק',   icon: 'tiktok',    color: '#111111', placeholder: '@username' },
  whatsapp:  { label: 'וואטסאפ',  icon: 'whatsapp',  color: '#25D366', placeholder: 'מספר טלפון' },
};

/** Build the full public URL for a platform value (handle, number, or full URL). */
export function socialUrl(platform: SocialPlatform, value?: string): string | null {
  if (!value || !value.trim()) return null;
  const v = value.trim();
  if (v.startsWith('http')) return v;
  if (platform === 'whatsapp') return `https://wa.me/${v.replace(/\D/g, '')}`;
  const handle = v.replace(/^@/, '');
  if (platform === 'instagram') return `https://instagram.com/${handle}`;
  if (platform === 'facebook') return `https://facebook.com/${handle}`;
  return `https://www.tiktok.com/@${handle}`; // tiktok
}
