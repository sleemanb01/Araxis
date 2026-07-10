import { Capabilities } from './user';

/**
 * A crew (collection: "crews") — a team with a manager and members, where each
 * member has their OWN capabilities within the crew. A user can belong to many
 * crews; their effective caps (the custom claim) are the UNION across all crews.
 * Crews are mutated only by Cloud Functions (which also keep claims in sync).
 */
export interface Crew {
  id: string;
  name: string;
  manager: string;                       // uid of the crew's manager
  members: Record<string, Capabilities>; // uid -> caps within this crew
  memberIds: string[];                   // = keys(members), for array-contains queries
  createdAt?: string;
}
