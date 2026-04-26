import React, { useEffect, useState } from 'react';
import './App.css';
import MapArea from './components/MapArea';
import ControlPanel from './components/ControlPanel';
import HazardModal from './components/HazardModal';
import SafeZoneModal from './components/SafeZoneModal';
import { fetchRoute } from './utils/routing';
import {
  mergeCircles,
  bufferBlob,
  clipRoute,
  findClosestPoints,
  calculateAreaSqKm,
} from './utils/geometry';
import { fetchNearbyHospitals } from './utils/overpass';
import {
  createIncident,
  createManualRoute,
  createSafeZone,
  clearAllRoutes,
  deleteIncident,
  deleteSafeZone,
  listCitizens,
  listEmergencies,
  listIncidents,
  listAidZones,
  listRoutes,
  listSafeZones,
  resolveEmergency,
  updateIncident,
  updateSafeZone,
} from './api/backend';

const TYPE_TO_LABEL = {
  fire: 'Wildfire',
  flood: 'Flood',
  earthquake: 'Earthquake',
  other: 'Chemical Spill',
};
const LABEL_TO_TYPE = {
  Wildfire: 'fire',
  Flood: 'flood',
  Earthquake: 'earthquake',
  'Chemical Spill': 'other',
};
const RISK_GRADES_DISPLAY = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const RISK_GRADES_API = { Low: 'low', Medium: 'medium', High: 'high', Critical: 'critical' };

function App() {
  const [mode, setMode] = useState('view'); // view, add_hazard, edit_hazard, add_safezone, edit_safezone, add_route, delete_zone
  const [hazards, setHazards] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [aidZones, setAidZones] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [peopleInDanger, setPeopleInDanger] = useState([]);
  const [emergencyRequests, setEmergencyRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);

  const [currentRoutePoints, setCurrentRoutePoints] = useState([]);
  const [pendingHazardLocation, setPendingHazardLocation] = useState(null);
  const [pendingSafeZoneLocation, setPendingSafeZoneLocation] = useState(null);
  const [editingHazard, setEditingHazard] = useState(null);
  const [editingSafeZone, setEditingSafeZone] = useState(null);
  const [isRouting, setIsRouting] = useState(false);

  const mapIncidentToHazard = (incident) => {
    const radiusMeters = (incident.radius_km || incident.base_radius_km || 0.5) * 1000;
    const baseRadiusMeters = (incident.base_radius_km || 0.5) * 1000;
    const circle = { lat: incident.location.lat, lng: incident.location.lng, radius: radiusMeters };
    const merged = mergeCircles([circle]);
    const expansionRateKm = incident.growth_per_hour_km ?? 0.1;
    const riskGrade = RISK_GRADES_DISPLAY[incident.risk_grade] || 'High';
    const typeLabel = TYPE_TO_LABEL[incident.incident_type] || 'Wildfire';

    return {
      id: String(incident.id),
      backendId: incident.id,
      circles: [circle],
      geoJson: merged,
      riskGeoJson: bufferBlob(merged, expansionRateKm),
      baseLat: incident.location.lat,
      baseLng: incident.location.lng,
      baseRadiusMeters,
      type: typeLabel,
      apiType: incident.incident_type,
      expansionRate: expansionRateKm,
      riskGrade,
      restrictions: incident.restrictions || {},
      population: Math.floor(calculateAreaSqKm(merged) * (1500 + Math.random() * 1000)),
    };
  };

  const mapSafeZone = (safeZone) => {
    const radiusMeters = Math.max((safeZone.capacity || 500) * 0.6, 150);
    const circle = { lat: safeZone.location.lat, lng: safeZone.location.lng, radius: radiusMeters };
    return {
      id: String(safeZone.id),
      backendId: safeZone.id,
      circles: [circle],
      geoJson: mergeCircles([circle]),
      baseLat: safeZone.location.lat,
      baseLng: safeZone.location.lng,
      capacity: safeZone.capacity,
      radiusMeters,
      name: safeZone.name,
    };
  };

  /** Same footprint as safe zones; blue layer for relief / medical points. */
  const mapAidZone = (aidZone) => {
    const radiusMeters = Math.max(500 * 0.6, 150);
    const circle = { lat: aidZone.location.lat, lng: aidZone.location.lng, radius: radiusMeters };
    return {
      id: `aid-${aidZone.id}`,
      backendId: aidZone.id,
      circles: [circle],
      geoJson: mergeCircles([circle]),
      baseLat: aidZone.location.lat,
      baseLng: aidZone.location.lng,
      name: aidZone.name,
      aidType: aidZone.aid_type,
    };
  };

  const mapEmergency = (req) => ({
    id: `emergency-${req.id}`,
    backendId: req.id,
    lat: req.location.lat,
    lng: req.location.lng,
    name: req.name,
    contactCode: req.contact_code,
    type: req.emergency_type,
    description: req.description,
    reporterName: req.reporter_name,
    createdAt: req.created_at,
  });

  /** Rehydrate polylines from GET /api/routes/ (waypoints: [{lat,lng}]). */
  const mapRouteFromApi = (row) => {
    const points = (row.waypoints || [])
      .map((wp) => {
        if (!wp || typeof wp !== 'object') return null;
        const lat = wp.lat ?? wp.latitude;
        const lng = wp.lng ?? wp.longitude;
        if (lat == null || lng == null) return null;
        return { lat: Number(lat), lng: Number(lng) };
      })
      .filter(Boolean);
    if (points.length < 2) return null;
    return {
      id: `route-${row.id}`,
      points,
      startZoneId: row.incident != null ? String(row.incident) : null,
      endZoneId: row.safezone != null ? String(row.safezone) : null,
    };
  };

  // Initial load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [incidentRows, safeZoneRows, aidZoneRows, citizenRows, emergencyRows, routeRows] =
          await Promise.all([
            listIncidents(),
            listSafeZones(),
            listAidZones().catch(() => []),
            listCitizens(),
            listEmergencies({ resolved: false }).catch(() => []),
            listRoutes().catch(() => []),
          ]);

        setHazards(incidentRows.map(mapIncidentToHazard));
        setSafeZones(safeZoneRows.map(mapSafeZone));
        setAidZones((aidZoneRows || []).map(mapAidZone));
        setRoutes(
          (routeRows || [])
            .map(mapRouteFromApi)
            .filter(Boolean)
        );
        setPeopleInDanger(
          citizenRows.map((citizen) => ({
            id: citizen.id,
            lat: citizen.location.lat,
            lng: citizen.location.lng,
          }))
        );
        setEmergencyRequests(emergencyRows.map(mapEmergency));
      } catch (error) {
        console.error('Failed to load backend data', error);
      }
    };
    loadInitialData();
  }, []);

  // Poll emergency requests every 6 seconds so the dispatcher sees user-app reports.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const rows = await listEmergencies({ resolved: false });
        setEmergencyRequests(rows.map(mapEmergency));
      } catch {
        // best-effort polling, ignore
      }
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // ─── Hazard create / edit ───────────────────────────────────────────────
  const handleAddHazard = (latlng) => {
    setPendingHazardLocation(latlng);
  };

  const saveHazard = async (data) => {
    if (mode === 'edit_hazard' && editingHazard) {
      try {
        const updated = await updateIncident(editingHazard.backendId, {
          location: { lat: data.lat, lng: data.lng },
          incident_type: LABEL_TO_TYPE[data.type] || 'other',
          base_radius_km: data.radius / 1000,
          growth_per_hour_km: data.expansionRate,
          risk_grade: RISK_GRADES_API[data.riskGrade] || 'high',
          restrictions: data.restrictions || {},
        });
        const refreshed = mapIncidentToHazard(updated);
        setHazards((prev) =>
          prev.map((hz) => (hz.id === refreshed.id ? refreshed : hz))
        );
      } catch (error) {
        console.error('Unable to update incident', error);
        alert('Could not update incident on backend.');
      } finally {
        setPendingHazardLocation(null);
        setEditingHazard(null);
        setMode('view');
      }
      return;
    }

    try {
      const created = await createIncident({
        location: { lat: data.lat, lng: data.lng },
        incident_type: LABEL_TO_TYPE[data.type] || 'other',
        base_radius_km: data.radius / 1000,
        growth_per_hour_km: data.expansionRate,
        risk_grade: RISK_GRADES_API[data.riskGrade] || 'high',
        restrictions: data.restrictions || {},
      });
      const newHazard = mapIncidentToHazard(created);
      setHazards((prev) => [...prev, newHazard]);

      fetchNearbyHospitals(data.lat, data.lng, 20000)
        .then((results) => setHospitals((prev) => [...prev, ...results]))
        .catch(() => null);
    } catch (error) {
      console.error('Unable to create incident', error);
      alert('Could not save incident to backend.');
    } finally {
      setPendingHazardLocation(null);
      setMode('view');
    }
  };

  // ─── SafeZone create / edit ─────────────────────────────────────────────
  const handleAddSafeZone = (latlng) => {
    setPendingSafeZoneLocation(latlng);
  };

  const saveSafeZone = async (data) => {
    if (mode === 'edit_safezone' && editingSafeZone) {
      try {
        const updated = await updateSafeZone(editingSafeZone.backendId, {
          location: { lat: data.lat, lng: data.lng },
          name: data.name || editingSafeZone.name || `Safe Zone ${editingSafeZone.backendId}`,
          capacity: Math.max(0, data.capacity ?? editingSafeZone.capacity ?? 500),
        });
        const refreshed = mapSafeZone(updated);
        setSafeZones((prev) =>
          prev.map((sz) => (sz.id === refreshed.id ? refreshed : sz))
        );
      } catch (error) {
        console.error('Unable to update safe zone', error);
        alert('Could not update safe zone on backend.');
      } finally {
        setPendingSafeZoneLocation(null);
        setEditingSafeZone(null);
        setMode('view');
      }
      return;
    }

    try {
      const created = await createSafeZone({
        location: { lat: data.lat, lng: data.lng },
        name: data.name?.trim() || `Safe Zone ${safeZones.length + 1}`,
        capacity: Math.max(50, data.capacity ?? 500),
      });
      setSafeZones((prev) => [...prev, mapSafeZone(created)]);
    } catch (error) {
      console.error('Unable to create safe zone', error);
      alert('Could not save safe zone to backend.');
    } finally {
      setPendingSafeZoneLocation(null);
      setMode('view');
    }
  };

  // ─── Routes ─────────────────────────────────────────────────────────────
  const handleRouteClick = async (data) => {
    const newPoints = [...currentRoutePoints, data];
    setCurrentRoutePoints(newPoints);

    if (newPoints.length === 2) {
      setIsRouting(true);
      const start = newPoints[0];
      const end = newPoints[1];

      let startPoint = { lat: start.lat, lng: start.lng };
      let endPoint = { lat: end.lat, lng: end.lng };

      if (start.geoJson && end.geoJson) {
        const closest = findClosestPoints(start.geoJson, end.geoJson);
        if (closest) {
          startPoint = closest.start;
          endPoint = closest.end;
        }
      }

      let routeCoords = await fetchRoute(startPoint, endPoint);
      setIsRouting(false);

      if (routeCoords) {
        routeCoords = clipRoute(routeCoords, start.geoJson, end.geoJson);
        const newRoute = {
          id: Date.now().toString(),
          points: routeCoords,
          startZoneId: start.zoneId,
          endZoneId: end.zoneId,
        };
        setRoutes([...routes, newRoute]);
        createManualRoute({
          waypoints: routeCoords,
          incident: Number(start.zoneId) || null,
          safezone: Number(end.zoneId) || null,
        }).catch(() => null);
      } else {
        alert('Could not find a valid road route between these points.');
      }
      setCurrentRoutePoints([]);
      setMode('view');
    }
  };

  // ─── Mode / clear / delete ──────────────────────────────────────────────
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setCurrentRoutePoints([]);
    setPendingHazardLocation(null);
    setPendingSafeZoneLocation(null);
    if (newMode !== 'edit_hazard') setEditingHazard(null);
    if (newMode !== 'edit_safezone') setEditingSafeZone(null);
  };

  const handleClearAllRoutes = async () => {
    if (routes.length === 0) return;
    if (
      !window.confirm(
        'Delete all saved evacuation routes from the server? The mobile app and this map will stop showing them until you draw new routes.',
      )
    ) {
      return;
    }
    try {
      await clearAllRoutes();
      setRoutes([]);
    } catch (e) {
      console.error('Unable to clear routes', e);
      window.alert('Could not clear routes. Check the API and try again.');
    }
  };

  const handleDeleteZone = async (zoneId, type) => {
    try {
      if (type === 'hazard') {
        await deleteIncident(Number(zoneId));
        setHazards((prev) => prev.filter((h) => h.id !== zoneId));
        setPeopleInDanger((prev) => prev.filter((p) => p.hazardId !== zoneId));
      } else if (type === 'safezone') {
        await deleteSafeZone(Number(zoneId));
        setSafeZones((prev) => prev.filter((s) => s.id !== zoneId));
      }
      setRoutes((prev) => prev.filter((r) => r.startZoneId !== zoneId && r.endZoneId !== zoneId));
      setMode('view');
    } catch (error) {
      console.error('Unable to delete zone', error);
      alert('Could not delete zone from backend.');
    }
  };

  // ─── Polygon click → enter edit mode ───────────────────────────────────
  const handleHazardClick = (hazard) => {
    setEditingHazard(hazard);
    setMode('edit_hazard');
    setPendingHazardLocation({ lat: hazard.baseLat, lng: hazard.baseLng });
  };

  const handleSafeZoneClick = (zone) => {
    setEditingSafeZone(zone);
    setMode('edit_safezone');
    setPendingSafeZoneLocation({ lat: zone.baseLat, lng: zone.baseLng });
  };

  // ─── Emergency requests ────────────────────────────────────────────────
  const handleResolveEmergency = async (id) => {
    try {
      await resolveEmergency(id);
      setEmergencyRequests((prev) => prev.filter((req) => req.backendId !== id));
    } catch (error) {
      console.error('Unable to resolve emergency', error);
    }
  };

  const getInstructionText = () => {
    if (isRouting) return 'Calculating best road route...';
    switch (mode) {
      case 'add_hazard':
        return 'Click anywhere on the map to specify a Hazard Zone.';
      case 'edit_hazard':
        return `Editing hazard${editingHazard ? ` (${editingHazard.type})` : ''}. Adjust details in the form, or click Cancel.`;
      case 'add_safezone':
        return 'Click anywhere on the map to specify a Safe Zone.';
      case 'edit_safezone':
        return `Editing safe zone${editingSafeZone ? ` (${editingSafeZone.name || '#' + editingSafeZone.backendId})` : ''}. Adjust details in the form, or click Cancel.`;
      case 'add_route':
        return currentRoutePoints.length === 0
          ? 'Click starting point (e.g., Hazard or City).'
          : 'Click destination (e.g., Safe Zone).';
      case 'delete_zone':
        return 'Click on any Hazard or Safe Zone to delete it entirely.';
      default:
        return null;
    }
  };

  const instruction = getInstructionText();

  const showHazardModal =
    pendingHazardLocation && (mode === 'add_hazard' || mode === 'edit_hazard');
  const showSafeZoneModal =
    pendingSafeZoneLocation && (mode === 'add_safezone' || mode === 'edit_safezone');

  return (
    <div className="app-container">
      <ControlPanel
        mode={mode}
        setMode={handleModeChange}
        hazards={hazards}
        safeZones={safeZones}
        aidZones={aidZones}
        routes={routes}
        onClearAllRoutes={handleClearAllRoutes}
      />

      <MapArea
        mode={mode}
        hazards={hazards}
        safeZones={safeZones}
        aidZones={aidZones}
        routes={routes}
        onAddHazard={handleAddHazard}
        onAddSafeZone={handleAddSafeZone}
        currentRoutePoints={currentRoutePoints}
        peopleInDanger={peopleInDanger}
        emergencyRequests={emergencyRequests}
        hospitals={hospitals}
        onRouteClick={handleRouteClick}
        onDeleteZone={handleDeleteZone}
        onHazardClick={handleHazardClick}
        onSafeZoneClick={handleSafeZoneClick}
        onResolveEmergency={handleResolveEmergency}
        setMode={setMode}
      />

      {instruction && (
        <div className="instruction-toast glass-panel">
          <span style={{ color: 'var(--primary)' }}>ℹ️</span> {instruction}
        </div>
      )}

      {showHazardModal && (
        <HazardModal
          mode={mode === 'edit_hazard' ? 'edit' : 'create'}
          location={pendingHazardLocation}
          initialValues={
            mode === 'edit_hazard' && editingHazard
              ? {
                  type: editingHazard.type,
                  expansionRate: editingHazard.expansionRate,
                  radius: editingHazard.baseRadiusMeters,
                  riskGrade: editingHazard.riskGrade,
                  restrictions: editingHazard.restrictions,
                }
              : null
          }
          onSave={saveHazard}
          onCancel={() => {
            setPendingHazardLocation(null);
            setEditingHazard(null);
            if (mode === 'edit_hazard') setMode('view');
          }}
        />
      )}

      {showSafeZoneModal && (
        <SafeZoneModal
          mode={mode === 'edit_safezone' ? 'edit' : 'create'}
          location={pendingSafeZoneLocation}
          initialValues={
            mode === 'edit_safezone' && editingSafeZone
              ? {
                  name: editingSafeZone.name,
                  radius: editingSafeZone.radiusMeters,
                  capacity: editingSafeZone.capacity,
                }
              : null
          }
          onSave={saveSafeZone}
          onCancel={() => {
            setPendingSafeZoneLocation(null);
            setEditingSafeZone(null);
            if (mode === 'edit_safezone') setMode('view');
          }}
        />
      )}
    </div>
  );
}

export default App;
