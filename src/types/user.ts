export type UserRole = 'customer' | 'provider';

export interface BaseProfile {
  uid: string;
  phone: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface CustomerProfile extends BaseProfile {
  role: 'customer';
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
}

export interface ProviderProfile extends BaseProfile {
  role: 'provider';
  location: string;
  logoUrl: string | null;
  themeColor: string;  // hex, e.g. "#2563EB"
  services: string[];  // categories the provider offers
  links?: SocialLinks; // optional social links
  workingDays?: number[];        // weekday indices the provider works (0=Sun..6=Sat)
  nextAvailable?: string | null; // manual override; otherwise derived from the calendar
}

export type UserProfile = CustomerProfile | ProviderProfile;
