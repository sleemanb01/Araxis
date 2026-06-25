export type UserRole = 'admin' | 'lead_tech' | 'junior_tech';

/**
 * A crew member. Stored in the `users` collection keyed by auth uid.
 * `role` is mirrored into a Firebase custom claim (see functions/) so security
 * rules can gate on `request.auth.token.role`.
 */
export interface UserProfile {
  uid: string;
  name: string;
  role: UserRole;
  managerId: string | null; // lead tech this user reports to (null for admin / lead)
  teamId: string;           // e.g. "team_alpha"
  phone?: string;           // E.164, captured at self-registration (admin lookup)
  createdAt?: string;       // ISO date string
}

export type CreateUserPayload = Omit<UserProfile, 'createdAt'>;

export function isAdmin(p: UserProfile | null): boolean {
  return p?.role === 'admin';
}

export function isLeadTech(p: UserProfile | null): boolean {
  return p?.role === 'lead_tech';
}
