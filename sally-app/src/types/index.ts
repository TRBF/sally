export type IncidentType = 'fire' | 'flood' | 'earthquake' | 'chemical' | 'explosion';
export type ZoneType = 'safe' | 'aid';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** Matches API / government UI: true means travel by that mode is forbidden. */
export interface TravelRestrictions {
  people?: boolean;
  car?: boolean;
  bicycle?: boolean;
  bus?: boolean;
}

export interface Incident {
  id: string;
  type: IncidentType;
  title: string;
  description: string;
  coordinate: Coordinate;
  radiusMeters: number;
  growthRateMetersPerMinute: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  startedAt: Date;
  active: boolean;
  restrictions?: TravelRestrictions;
}

export interface SafeZone {
  id: string;
  name: string;
  coordinate: Coordinate;
  radiusMeters: number;
  capacity: number;
  currentOccupancy: number;
  available: boolean;
}

export interface AidZone {
  id: string;
  name: string;
  type: 'medical' | 'shelter' | 'food' | 'general';
  coordinate: Coordinate;
  /** Same scale as safe zones when not specified by backend. */
  radiusMeters?: number;
  available: boolean;
  description: string;
}

export interface RouteStep {
  coordinate: Coordinate;
  instruction?: string;
}

export type TransportMode = 'car' | 'bike' | 'walk' | 'transit';

export interface Route {
  id: string;
  steps: RouteStep[];
  governmentSteps?: RouteStep[];
  totalDistanceMeters: number;
  estimatedTimeMinutes: number;
  targetZoneId: string;
  targetZoneName: string;
  mode: TransportMode;
}

export interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger' | 'critical';
  timestamp: Date;
  incidentId?: string;
}

export interface MapState {
  userLocation: Coordinate | null;
  incidents: Incident[];
  safeZones: SafeZone[];
  aidZones: AidZone[];
  activeRoute: Route | null;
  alerts: EmergencyAlert[];
  selectedIncidentId: string | null;
}

export type ContactRelationship = 'family' | 'friend' | 'colleague' | 'other';

export interface Contact {
  id: string;
  name: string;
  code: string;
  coordinate: Coordinate;
  phone?: string;
  relationship: ContactRelationship;
}
