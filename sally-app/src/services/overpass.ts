import type { Coordinate } from '../types';

export interface Hospital {
  id: string;
  name: string;
  coordinate: Coordinate;
  address?: string;
}

interface OverpassNode {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassNode[];
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Fetches hospitals around a coordinate using OpenStreetMap's Overpass API.
 * Mirrors the implementation used by the government UI so behaviour stays
 * consistent across both apps.
 */
export async function fetchNearbyHospitals(
  center: Coordinate,
  radiusMeters: number = 15000
): Promise<Hospital[]> {
  const { latitude, longitude } = center;
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
      way["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
      relation["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
    });
    if (!response.ok) {
      throw new Error(`Overpass error: ${response.status}`);
    }

    const data = (await response.json()) as OverpassResponse;

    return data.elements
      .map((element) => {
        const lat =
          element.type === 'node' ? element.lat : element.center?.lat;
        const lng =
          element.type === 'node' ? element.lon : element.center?.lon;
        if (lat == null || lng == null) return null;

        return {
          id: `hospital-${element.id}`,
          name: element.tags?.name?.trim() || 'Hospital',
          coordinate: { latitude: lat, longitude: lng },
          address: element.tags?.['addr:street'],
        } satisfies Hospital;
      })
      .filter((h): h is Hospital => h !== null);
  } catch (error) {
    console.warn('Failed to fetch hospitals from Overpass', error);
    return [];
  }
}
