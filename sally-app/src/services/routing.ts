import type { Coordinate, Route, TransportMode, Incident } from '../types';
import { API_URL } from '../config/api';

// Same approach as the government UI (sally/src/utils/routing.js):
// hit the public OSRM demo server with a single driving request and read the
// returned GeoJSON line. Simple, fast, follows real roads.
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const backendHeaders: Record<string, string> = API_URL.includes('.ngrok-free.app')
  ? { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
  : { 'Content-Type': 'application/json' };

interface BackendRouteRow {
  id: number;
  waypoints: Array<{ lat: number; lng: number }>;
  incident: number | null;
  safezone: number | null;
  created_at: string;
}

/**
 * Haversine distance in metres between two coordinates.
 */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const aVal =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

function routeLengthMeters(points: Coordinate[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return Math.round(total);
}

// Average speed (km/h) per mode → used to estimate ETA from total distance.
const MODE_SPEED_KMH: Record<TransportMode, number> = {
  car: 35,
  bike: 16,
  walk: 5,
  transit: 25,
};

function estimateMinutes(meters: number, mode: TransportMode): number {
  const kmh = MODE_SPEED_KMH[mode] ?? 25;
  const minutes = (meters / 1000) / kmh * 60;
  return Math.max(1, Math.round(minutes));
}

/**
 * Fetch a road-following path from `start` to `end` using the public OSRM
 * server. Returns the polyline as `Coordinate[]` (or `null` on failure).
 *
 * Matches the government interface (`sally/src/utils/routing.js`) exactly so
 * both UIs draw routes the same way.
 */
async function fetchOsrmPath(start: Coordinate, end: Coordinate): Promise<Coordinate[] | null> {
  try {
    const url =
      `${OSRM_URL}/${start.longitude},${start.latitude};${end.longitude},${end.latitude}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const coordinates: [number, number][] | undefined = data?.routes?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length < 2) return null;
    // OSRM returns [lng, lat]; map to our Coordinate shape.
    return coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  } catch {
    return null;
  }
}

function toRouteSteps(points: Coordinate[], startInstruction: string, endInstruction: string) {
  return points.map((coordinate, index) => ({
    coordinate,
    instruction:
      index === 0
        ? startInstruction
        : index === points.length - 1
        ? endInstruction
        : undefined,
  }));
}

/** One manually drawn corridor from authorities (`GET /routes/`). */
export interface GovernmentCorridorOverlay {
  id: string;
  coordinates: Coordinate[];
}

/**
 * All government-drawn corridors (e.g. one per incident / safe zone). Map uses
 * this so every official polyline is visible, not only the route matching the
 * user’s current navigation target.
 */
export async function fetchAllGovernmentCorridors(): Promise<GovernmentCorridorOverlay[]> {
  try {
    const res = await fetch(`${API_URL}/routes/`, { headers: backendHeaders });
    if (!res.ok) return [];
    const rows = (await res.json()) as BackendRouteRow[];
    const out: GovernmentCorridorOverlay[] = [];
    for (const row of rows) {
      if (!Array.isArray(row.waypoints) || row.waypoints.length < 2) continue;
      out.push({
        id: String(row.id),
        coordinates: row.waypoints.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export interface RoutingOptions {
  from: Coordinate;
  to: Coordinate;
  mode: TransportMode;
  targetZoneId: string;
  targetZoneName: string;
  /** Optional, only used for `pickBestTarget` scoring. Not used to reject routes. */
  incidents?: Incident[];
}

/**
 * Fetch a road-following route from the user's location to the chosen safe
 * zone. Mirrors the government UI: one OSRM call, one polyline, done.
 *
 * Official corridors are loaded separately via `fetchAllGovernmentCorridors` so
 * every backend route can be drawn on the map.
 */
export async function fetchRoute(opts: RoutingOptions): Promise<Route> {
  const { from, to, mode, targetZoneId, targetZoneName } = opts;

  const coords = await fetchOsrmPath(from, to);

  if (!coords || coords.length < 2) {
    throw new Error('No route returned from router');
  }

  const totalDistanceMeters = routeLengthMeters(coords);
  const estimatedTimeMinutes = estimateMinutes(totalDistanceMeters, mode);

  return {
    id: `route-${mode}-${Date.now()}`,
    steps: toRouteSteps(coords, 'Start – your location', `Arrive at ${targetZoneName}`),
    totalDistanceMeters,
    estimatedTimeMinutes,
    targetZoneId,
    targetZoneName,
    mode,
  };
}

/**
 * Pick the best safe zone target for the user.
 *
 * Mirrors the backend's `_nearest_safezone` helper: prefer the closest
 * available safe zone, with a soft penalty for ones whose straight-line path
 * passes very close to an active incident. We don't *require* an incident-free
 * path here — the OSRM road network usually routes around hazards naturally,
 * and being too strict was leaving users without any route.
 */
export function pickBestTarget<T extends { id: string; coordinate: Coordinate; name?: string; available?: boolean }>(
  from: Coordinate,
  zones: T[],
  incidents: Incident[]
): T | null {
  if (zones.length === 0) return null;

  const usable = zones.filter((z) => z.available !== false);
  const pool = usable.length > 0 ? usable : zones;

  let best: T | null = null;
  let bestScore = Infinity;

  for (const zone of pool) {
    const dist = haversineDistance(from, zone.coordinate);
    let penalty = 0;
    for (const inc of incidents) {
      if (!inc.active) continue;
      // Cheap point-to-segment distance approximation
      const dx = zone.coordinate.longitude - from.longitude;
      const dy = zone.coordinate.latitude - from.latitude;
      const len2 = dx * dx + dy * dy;
      let t = 0;
      if (len2 > 0) {
        t = Math.max(
          0,
          Math.min(
            1,
            ((inc.coordinate.longitude - from.longitude) * dx +
              (inc.coordinate.latitude - from.latitude) * dy) /
              len2
          )
        );
      }
      const nearestLon = from.longitude + t * dx;
      const nearestLat = from.latitude + t * dy;
      const segDist = haversineDistance(inc.coordinate, {
        latitude: nearestLat,
        longitude: nearestLon,
      });
      // Soft penalty if straight line passes within 1.5× the current radius —
      // this just nudges the picker away from obviously dangerous targets.
      if (segDist < inc.radiusMeters * 1.5) {
        penalty += 5_000; // metres of equivalent extra distance
      }
    }
    const score = dist + penalty;
    if (score < bestScore) {
      bestScore = score;
      best = zone;
    }
  }

  return best;
}
