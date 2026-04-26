import { API_URL } from '../config/api';
import type { AidZone, Coordinate, Incident, SafeZone } from '../types';

const extraHeaders: Record<string, string> = API_URL.includes('.ngrok-free.app')
  ? { 'ngrok-skip-browser-warning': 'true' }
  : {};

interface ApiLocation {
  lat: number;
  lng: number;
}

interface ApiIncident {
  id: number;
  location: ApiLocation;
  incident_type: 'fire' | 'flood' | 'earthquake' | 'other';
  radius_km: number;
  growth_per_hour_km: number;
  risk_grade?: 'low' | 'medium' | 'high' | 'critical';
  restrictions?: {
    people?: boolean;
    car?: boolean;
    bicycle?: boolean;
    bus?: boolean;
  };
  created_at: string;
}

interface ApiSafeZone {
  id: number;
  location: ApiLocation;
  name: string;
  capacity: number;
}

interface ApiAidZone {
  id: number;
  location: ApiLocation;
  name: string;
  aid_type: 'medical' | 'food' | 'shelter';
}

function toCoordinate(location: ApiLocation): Coordinate {
  return { latitude: location.lat, longitude: location.lng };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchIncidents(): Promise<Incident[]> {
  const rows = await request<ApiIncident[]>('/incidents/');
  return rows.map((row) => ({
    id: String(row.id),
    type: row.incident_type === 'other' ? 'explosion' : row.incident_type,
    title: `${row.incident_type.toUpperCase()} Incident`,
    description: 'Incident reported by authorities.',
    coordinate: toCoordinate(row.location),
    radiusMeters: row.radius_km * 1000,
    growthRateMetersPerMinute: (row.growth_per_hour_km * 1000) / 60,
    severity: row.risk_grade ?? 'high',
    startedAt: new Date(row.created_at),
    active: true,
    restrictions: row.restrictions,
  }));
}

export async function fetchSafeZones(): Promise<SafeZone[]> {
  const rows = await request<ApiSafeZone[]>('/safezones/');
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    coordinate: toCoordinate(row.location),
    radiusMeters: Math.max(row.capacity * 0.6, 120),
    capacity: row.capacity,
    currentOccupancy: 0,
    available: true,
  }));
}

export async function fetchAidZones(): Promise<AidZone[]> {
  const rows = await request<ApiAidZone[]>('/aidzones/');
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    type: row.aid_type,
    coordinate: toCoordinate(row.location),
    radiusMeters: Math.max(500 * 0.6, 120),
    available: true,
    description: `${row.aid_type} support point.`,
  }));
}

export type EmergencyRequestType =
  | 'trapped'
  | 'medical'
  | 'unresponsive'
  | 'fire'
  | 'flood'
  | 'other';

export interface CreateEmergencyRequestInput {
  name: string;
  contactCode?: string;
  coordinate: Coordinate;
  emergencyType: EmergencyRequestType;
  description?: string;
  reporterName?: string;
}

interface ApiEmergencyRequest {
  id: number;
  name: string;
  contact_code: string;
  location: ApiLocation;
  emergency_type: EmergencyRequestType;
  description: string;
  reporter_name: string;
  resolved: boolean;
  created_at: string;
}

export async function createEmergencyRequest(
  input: CreateEmergencyRequestInput
): Promise<ApiEmergencyRequest> {
  return request<ApiEmergencyRequest>('/emergencies/', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      contact_code: input.contactCode ?? '',
      location: {
        lat: input.coordinate.latitude,
        lng: input.coordinate.longitude,
      },
      emergency_type: input.emergencyType,
      description: input.description ?? '',
      reporter_name: input.reporterName ?? '',
    }),
  });
}
