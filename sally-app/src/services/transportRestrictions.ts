import type { Coordinate, Incident, TransportMode } from '../types';
import { haversineDistance } from './routing';

/**
 * Government API / dashboard semantics: each flag when true means that mode is blocked.
 */
export function restrictedTransportModesAt(
  user: Coordinate,
  incidents: Incident[]
): TransportMode[] {
  const blocked = new Set<TransportMode>();
  for (const inc of incidents) {
    if (!inc.active) continue;
    if (haversineDistance(user, inc.coordinate) > inc.radiusMeters) continue;
    const r = inc.restrictions;
    if (!r) continue;
    if (r.people) blocked.add('walk');
    if (r.car) blocked.add('car');
    if (r.bicycle) blocked.add('bike');
    if (r.bus) blocked.add('transit');
  }
  return Array.from(blocked);
}
