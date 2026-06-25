import { Crew } from '../types/crew';
import { WAREHOUSE, isCrewLocation, crewIdFromLocation } from '../types/inventory';

/** Human label for an inventory location key (warehouse / crew_<id> / raw). */
export function locationLabel(key: string, crews: Crew[]): string {
  if (key === WAREHOUSE) return 'מחסן';
  if (isCrewLocation(key)) {
    return crews.find((c) => c.id === crewIdFromLocation(key))?.name ?? 'צוות';
  }
  return key;
}
