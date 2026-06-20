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

export interface ProviderProfile extends BaseProfile {
  role: 'provider';
  location: string;
  logoUrl: string | null;
  themeColor: string;  // hex, e.g. "#2563EB"
  services: string[];  // categories the provider offers
}

export type UserProfile = CustomerProfile | ProviderProfile;
