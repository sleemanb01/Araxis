/**
 * Shared catalog of service types a crew can provide (collection: "services").
 * It's an open list — if someone's service isn't there, they add it, and it
 * becomes available to everyone. A user stores the names they provide on their
 * own profile (`UserProfile.services`).
 */
export interface ServiceOption {
  id: string;
  name: string;
}
