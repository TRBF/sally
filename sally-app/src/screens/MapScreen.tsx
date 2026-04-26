import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Callout,
  Circle,
  Polyline,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { useContacts } from '../context/ContactsContext';
import { Ionicons } from '@expo/vector-icons';

import {
  MOCK_ALERTS,
} from '../data/mockData';
import type { AidZone, Contact, Coordinate, Incident, EmergencyAlert, Route, SafeZone, TransportMode } from '../types';
import {
  fetchRoute,
  pickBestTarget,
  fetchAllGovernmentCorridors,
  type GovernmentCorridorOverlay,
} from '../services/routing';
import { fetchAidZones, fetchIncidents, fetchSafeZones } from '../services/backend';
import { restrictedTransportModesAt } from '../services/transportRestrictions';
import { fetchNearbyHospitals, type Hospital } from '../services/overpass';
import AlertBanner from '../components/AlertBanner';
import InfoPanel from '../components/InfoPanel';
import Legend from '../components/Legend';
import ModeSelector from '../components/ModeSelector';
import ReportEmergencyModal, { PersonalEmergencyType } from '../components/ReportEmergencyModal';
import ReportFriendEmergencyModal from '../components/ReportFriendEmergencyModal';

// Height of the panel in its collapsed (peek) state — used to offset floating buttons
const PANEL_PEEK_HEIGHT = 90;

const INCIDENT_SEVERITY_ALPHA: Record<string, string> = {
  low: '40',
  medium: '55',
  high: '70',
  critical: '90',
};

const INCIDENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fire: 'flame',
  flood: 'water',
  earthquake: 'warning',
  chemical: 'nuclear',
  explosion: 'flash',
};

const MODE_POLYLINE: Record<TransportMode, { color: string; dash: number[] }> = {
  car: { color: '#1D4ED8', dash: [] },
  bike: { color: '#059669', dash: [10, 5] },
  walk: { color: '#7C3AED', dash: [6, 8] },
  transit: { color: '#D97706', dash: [14, 4] },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  family: '❤️ Family',
  friend: '👋 Friend',
  colleague: '💼 Colleague',
  other: '👤 Other',
};

/** Google Maps: hide malls, shops, attractions, schools; medical + transport stay. App overlays unchanged. */
const MAP_STYLE_HIDE_RETAIL_POI = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
];

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const { contacts } = useContacts();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(MOCK_ALERTS);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [safeZones, setSafeZones] = useState<SafeZone[]>([]);
  const [aidZones, setAidZones] = useState<AidZone[]>([]);
  const [mode, setMode] = useState<TransportMode>('walk');
  const [route, setRoute] = useState<Route | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [friendReportContact, setFriendReportContact] = useState<Contact | null>(null);
  const [governmentCorridors, setGovernmentCorridors] = useState<GovernmentCorridorOverlay[]>([]);
  // Default to Cluj-Napoca city centre (Piața Unirii) until GPS resolves.
  const [userLocation, setUserLocation] = useState({
    latitude: 46.7712,
    longitude: 23.5897,
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadMapData = async () => {
      const corridorsPromise = fetchAllGovernmentCorridors();
      try {
        const [incidentRows, safeZoneRows, aidZoneRows] = await Promise.all([
          fetchIncidents(),
          fetchSafeZones(),
          fetchAidZones(),
        ]);
        setIncidents(incidentRows);
        setSafeZones(safeZoneRows);
        setAidZones(aidZoneRows);
      } catch (error) {
        console.error('Failed to fetch map data from backend', error);
      }
      try {
        setGovernmentCorridors(await corridorsPromise);
      } catch {
        // keep previous corridors on transient `/routes/` failure
      }
    };

    loadMapData();
    const intervalId = setInterval(loadMapData, 8000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const locateUser = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const nextLocation = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
        };
        setUserLocation(nextLocation);
        mapRef.current?.animateToRegion(
          {
            ...nextLocation,
            latitudeDelta: 0.045,
            longitudeDelta: 0.045,
          },
          600
        );
      } catch (error) {
        console.warn('Unable to get current GPS location', error);
      }
    };

    locateUser();
  }, []);

  // Fetch nearby hospitals once we know roughly where the user is.
  useEffect(() => {
    let cancelled = false;
    fetchNearbyHospitals(userLocation, 18000)
      .then((results) => {
        if (!cancelled) setHospitals(results);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [userLocation.latitude, userLocation.longitude]);

  const userCoordinate: Coordinate = useMemo(
    () => ({ latitude: userLocation.latitude, longitude: userLocation.longitude }),
    [userLocation.latitude, userLocation.longitude]
  );

  const restrictedModes = useMemo(
    () => restrictedTransportModesAt(userCoordinate, incidents),
    [userCoordinate, incidents]
  );

  const restrictedModesKey = restrictedModes.slice().sort().join(',');

  // If authorities block the current mode (e.g. user entered a restricted zone), switch to an allowed one.
  useEffect(() => {
    if (!restrictedModesKey) return;
    const blocked = restrictedModesKey.split(',') as TransportMode[];
    if (!blocked.includes(mode)) return;
    const preference: TransportMode[] = ['walk', 'bike', 'car', 'transit'];
    const next = preference.find((m) => !blocked.includes(m));
    if (next) setMode(next);
  }, [restrictedModesKey, mode]);

  // Grow incident radii over time
  useEffect(() => {
    const interval = setInterval(() => {
      setIncidents((prev) =>
        prev.map((inc) => ({
          ...inc,
          radiusMeters: inc.radiusMeters + inc.growthRateMetersPerMinute / 6,
        }))
      );
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation for user dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Track only the *identity* of the incident set, not their growing radii. We
  // don't want to refetch the route every 10s just because hazards expanded a
  // few metres — the OSRM road graph doesn't change, and constantly re-fetching
  // caused jittery UI and "Calculating…" flashes.
  const incidentSignature = incidents
    .filter((i) => i.active)
    .map((i) => i.id)
    .sort()
    .join('|');
  const safeZoneSignature = safeZones.map((z) => z.id).sort().join('|');

  // Refs let us read the latest values inside loadRoute without making the
  // callback's identity depend on objects that change every tick.
  const incidentsRef = useRef(incidents);
  const safeZonesRef = useRef(safeZones);
  useEffect(() => { incidentsRef.current = incidents; }, [incidents]);
  useEffect(() => { safeZonesRef.current = safeZones; }, [safeZones]);

  const loadRoute = useCallback(
    async (selectedMode: TransportMode, origin: Coordinate) => {
      setRouteLoading(true);
      setRouteError(null);

      try {
        const target = pickBestTarget(
          origin,
          safeZonesRef.current,
          incidentsRef.current
        );
        if (!target) throw new Error('No safe zones available');

        const result = await fetchRoute({
          from: origin,
          to: target.coordinate,
          mode: selectedMode,
          targetZoneId: target.id,
          targetZoneName: target.name,
          incidents: incidentsRef.current,
        });

        setRoute(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Routing failed';
        setRouteError(msg);
        // Keep the last known route on screen; clearing it caused the
        // "Calculating…" flicker every time growth ticked.
      } finally {
        setRouteLoading(false);
      }
    },
    []
  );

  // Refetch only on things that meaningfully change the route:
  // - transport mode
  // - user location
  // - the *set* of active incidents (not their radii)
  // - the set of safe zones
  useEffect(() => {
    if (safeZones.length === 0) return;
    loadRoute(mode, userLocation);
  }, [mode, userLocation.latitude, userLocation.longitude, incidentSignature, safeZoneSignature, loadRoute]);

  const handleModeChange = (m: TransportMode) => {
    setMode(m);
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleNavigate = () => {
    if (!route) return;
    Alert.alert(
      'Navigation Started',
      `Following ${route.mode.toUpperCase()} route to ${route.targetZoneName}.\nEstimated time: ${route.estimatedTimeMinutes} min  (${(route.totalDistanceMeters / 1000).toFixed(1)} km)`,
      [{ text: 'OK' }]
    );
  };

  const handleReportEmergency = (type: PersonalEmergencyType, description: string) => {
    setIsReportModalVisible(false);
    setTimeout(() => {
      Alert.alert(
        'Report Submitted',
        `Your emergency report for ${type.toUpperCase()} has been submitted to authorities. Help is on the way.`,
        [{ text: 'OK' }]
      );
    }, 500);
  };

  const nearestIncident = incidents[0] ?? null;
  const routeCoords = route?.steps.map((s) => s.coordinate) ?? [];
  const polylineStyle = MODE_POLYLINE[mode];
  const renderRouteLine = (
    coordinates: { latitude: number; longitude: number }[],
    strokeColor: string,
    strokeWidth: number,
    lineDashPattern?: number[],
    reactKey?: string
  ) =>
    coordinates.length > 1 ? (
      <Polyline
        key={reactKey}
        coordinates={coordinates}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        lineDashPattern={lineDashPattern}
        lineCap="round"
        lineJoin="round"
      />
    ) : null;

  // Floating buttons sit above the panel + home indicator
  const floatingBottom = PANEL_PEEK_HEIGHT + insets.bottom + 65;

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.055,
          longitudeDelta: 0.055,
        }}
        mapPadding={{ top: insets.top + 60, bottom: 0, left: 0, right: 0 }}
        customMapStyle={MAP_STYLE_HIDE_RETAIL_POI}
        showsPointsOfInterest={false}
        poiClickEnabled={false}
        showsUserLocation
        showsCompass
        showsScale
      >
        {/* ─── Incidents (red circles + projected growth + icons) ─── */}
        {incidents.map((inc) => {
          const color = '#EF4444'; // Always red now
          const projectedRadius = inc.radiusMeters + inc.growthRateMetersPerMinute * 60;
          return (
            <React.Fragment key={inc.id}>
              {/* Current incident area */}
              <Circle
                center={inc.coordinate}
                radius={inc.radiusMeters}
                strokeColor={color}
                strokeWidth={2}
                fillColor={`${color}${INCIDENT_SEVERITY_ALPHA[inc.severity]}`}
              />
              {/* Projected area in 1 hour — dashed outline, lower alpha */}
              <Circle
                center={inc.coordinate}
                radius={projectedRadius}
                strokeColor={`${color}80`}
                strokeWidth={1.5}
                fillColor={`${color}10`}
                lineDashPattern={[8, 6]}
              />
              {/* Small center marker with icon */}
              <Marker coordinate={inc.coordinate} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.incidentMarkerContainer}>
                  <View style={styles.incidentIconWrapper}>
                    <Ionicons name={INCIDENT_ICONS[inc.type] ?? 'warning'} size={12} color="#FFFFFF" />
                  </View>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* ─── Safe Zones (green circles + house icon) ─── */}
        {safeZones.map((zone) => (
          <React.Fragment key={zone.id}>
            <Circle
              center={zone.coordinate}
              radius={zone.radiusMeters}
              strokeColor="#16A34A"
              strokeWidth={2.5}
              fillColor="#22C55E28"
            />
            <Marker coordinate={zone.coordinate} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.incidentMarkerContainer}>
                <View style={[styles.incidentIconWrapper, { backgroundColor: '#16A34A', borderColor: '#FFFFFF' }]}>
                  <Ionicons name="home" size={12} color="#FFFFFF" />
                </View>
              </View>
            </Marker>
          </React.Fragment>
        ))}

        {/* ─── Aid Zones (blue circle + white cross, same scale as safe zones) ─── */}
        {aidZones.map((aid) => (
          <React.Fragment key={aid.id}>
            <Circle
              center={aid.coordinate}
              radius={aid.radiusMeters ?? Math.max(500 * 0.6, 120)}
              strokeColor="#2563EB"
              strokeWidth={2.5}
              fillColor="#2563EB28"
            />
            <Marker coordinate={aid.coordinate} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.incidentMarkerContainer}>
                <View style={[styles.incidentIconWrapper, { backgroundColor: '#2563EB', borderColor: '#FFFFFF' }]}>
                  <Text style={styles.aidCross}>+</Text>
                </View>
              </View>
            </Marker>
          </React.Fragment>
        ))}

        {/* ─── Hospitals (Overpass) ─── */}
        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            coordinate={hospital.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.hospitalPinWrapper}>
              <View style={styles.hospitalPin}>
                <Text style={styles.hospitalPinPlus}>+</Text>
              </View>
            </View>
            <Callout tooltip>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutName}>{hospital.name}</Text>
                <Text style={styles.calloutSubdued}>Medical Emergency Center</Text>
                {hospital.address ? (
                  <Text style={styles.calloutPhone}>{hospital.address}</Text>
                ) : null}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* ─── All government-drawn corridors (one per backend route / incident) ─── */}
        {governmentCorridors.map((corridor) =>
          renderRouteLine(corridor.coordinates, '#0F766E', 4, [8, 6], `gov-${corridor.id}`)
        )}

        {/* ─── Route ─── */}
        {renderRouteLine(
          routeCoords,
          polylineStyle.color,
          5,
          polylineStyle.dash.length > 0 ? polylineStyle.dash : undefined,
          'user-route'
        )}

        {/* ─── Friends & Family Pins ─── */}
        {contacts.map((contact) => (
          <Marker
            key={contact.id}
            coordinate={contact.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => setFriendReportContact(contact)}
          >
            {/* collapsable={false}: Android keeps subtree in native hierarchy so marker bitmap is not empty */}
            <View collapsable={false}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setFriendReportContact(contact)}
                accessibilityRole="button"
                accessibilityLabel={`${contact.name}, report emergency`}
              >
                <View style={styles.contactPinWrapper}>
                  <View style={styles.contactPin}>
                    <Text style={styles.contactPinInitials}>
                      {contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.contactPinTail} />
                </View>
              </TouchableOpacity>
            </View>
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutName}>{contact.name}</Text>
                <Text style={styles.calloutRelationship}>
                  {RELATIONSHIP_LABELS[contact.relationship] ?? contact.relationship}
                </Text>
                {contact.phone && (
                  <Text style={styles.calloutPhone}>{contact.phone}</Text>
                )}
                <TouchableOpacity
                  style={styles.calloutReportButton}
                  onPress={() => setFriendReportContact(contact)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="warning" size={14} color="#FFFFFF" />
                  <Text style={styles.calloutReportText}>Report emergency</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* ─── User Location ─── */}
        <Marker coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.userLocationWrapper}>
            <Animated.View
              style={[styles.userPulse, { transform: [{ scale: pulseAnim }] }]}
            />
            <View style={styles.userDot} />
          </View>
        </Marker>
      </MapView>

      {/* ─── Top Overlay: LIVE indicator + alerts (no header) ─── */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <View style={styles.topSpacer} />
          <View style={styles.topRight}>
            {routeLoading && (
              <ActivityIndicator size="small" color="#2563EB" style={styles.spinner} />
            )}
            {(() => {
              const activeCount = incidents.filter(i => i.active).length;
              if (activeCount > 0) {
                return (
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>
                      {activeCount} ACTIVE INCIDENT{activeCount === 1 ? '' : 'S'}
                    </Text>
                  </View>
                );
              }
              return (
                <View style={[styles.livePill, { backgroundColor: '#F0FDF4' }]}>
                  <View style={[styles.liveDot, { backgroundColor: '#16A34A' }]} />
                  <Text style={[styles.liveText, { color: '#16A34A' }]}>ALL CLEAR</Text>
                </View>
              );
            })()}
          </View>
        </View>

        {routeError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              {route
                ? '⚠ Could not refresh route – showing last known route'
                : '⚠ Route unavailable – check your connection'}
            </Text>
          </View>
        )}

        {alerts.map((alert) => (
          <AlertBanner
            key={alert.id}
            alert={alert}
            onDismiss={() => dismissAlert(alert.id)}
          />
        ))}
      </View>

      {/* ─── Recenter Button ─── */}
      <TouchableOpacity
        style={[styles.recenterButton, { bottom: floatingBottom }]}
        onPress={() =>
          mapRef.current?.animateToRegion({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.045,
            longitudeDelta: 0.045,
          }, 600)
        }
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={24} color="#1E3A8A" />
      </TouchableOpacity>

      {/* ─── Emergency Report Button ─── */}
      <TouchableOpacity
        style={[styles.reportButton, { bottom: floatingBottom + 48 }]}
        onPress={() => setIsReportModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="warning" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* ─── Legend ─── */}
      <Legend bottomOffset={floatingBottom} />

      {/* ─── Mode Selector ─── */}
      <ModeSelector
        mode={mode}
        loading={routeLoading}
        onSelect={handleModeChange}
        bottomOffset={PANEL_PEEK_HEIGHT + insets.bottom}
        restrictedModes={restrictedModes}
      />

      {/* ─── Info Panel ─── */}
      <InfoPanel
        route={route}
        nearestIncident={nearestIncident}
        onNavigate={handleNavigate}
        bottomInset={insets.bottom}
      />

      {/* ─── Modals ─── */}
      <ReportEmergencyModal
        visible={isReportModalVisible}
        onClose={() => setIsReportModalVisible(false)}
        onSubmit={handleReportEmergency}
      />
      <ReportFriendEmergencyModal
        visible={friendReportContact !== null}
        contact={friendReportContact}
        onClose={() => setFriendReportContact(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // ─── Incident dot marker ───
  incidentMarkerContainer: {
    alignItems: 'center',
    gap: 4,
  },
  incidentIconWrapper: {
    backgroundColor: '#EF4444',
    padding: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  aidCross: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: -1,
    textAlign: 'center',
    minWidth: 12,
  },
  incidentDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },

  // ─── Safe zone dots removed in favor of icons ───

  // ─── Aid dots removed in favor of icons ───

  // ─── User location ───
  userLocationWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulse: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 14,
    backgroundColor: '#2563EB30',
  },
  userDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  // ─── Top Overlay (replaces header) ───
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  topSpacer: { flex: 1 },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  spinner: {
    marginRight: 2,
  },
  errorBanner: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 12,
    marginTop: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  errorText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },

  // ─── Recenter ───
  recenterButton: {
    position: 'absolute',
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  reportButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  recenterIcon: {
    fontSize: 20,
    color: '#1E3A8A',
    fontWeight: '700',
  },

  // ─── Contact pins ───
  contactPinWrapper: {
    alignItems: 'center',
  },
  contactPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  contactPinInitials: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contactPinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#16A34A',
    marginTop: -2,
  },
  calloutContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F0FDF4',
  },
  calloutName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  calloutRelationship: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  calloutPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  calloutSubdued: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  calloutReportButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  calloutReportText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },

  // ─── Hospital pin ───
  hospitalPinWrapper: {
    alignItems: 'center',
  },
  hospitalPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  hospitalPinPlus: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },
});
