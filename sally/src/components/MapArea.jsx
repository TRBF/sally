import React from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  GeoJSON,
  Tooltip,
  Polyline,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';

function MapEvents({ mode, onAddHazard, onAddSafeZone, onRouteClick }) {
  useMapEvents({
    click(e) {
      if (mode === 'add_hazard') {
        onAddHazard(e.latlng);
      } else if (mode === 'add_safezone') {
        onAddSafeZone(e.latlng);
      } else if (mode === 'add_route') {
        onRouteClick(e.latlng);
      }
    },
  });
  return null;
}

const EMERGENCY_LABELS = {
  trapped: 'Trapped / unable to evacuate',
  medical: 'Medical emergency',
  unresponsive: 'Unresponsive / cannot reach',
  fire: 'Fire on location',
  flood: 'Flood at location',
  other: 'Emergency assistance required',
};

export default function MapArea({
  mode,
  hazards,
  safeZones,
  aidZones = [],
  routes,
  onAddHazard,
  onAddSafeZone,
  currentRoutePoints,
  peopleInDanger,
  emergencyRequests,
  hospitals,
  onRouteClick,
  onDeleteZone,
  onHazardClick,
  onSafeZoneClick,
  onResolveEmergency,
}) {
  const defaultCenter = [46.7712, 23.5897];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={9}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapEvents
        mode={mode}
        onAddHazard={onAddHazard}
        onAddSafeZone={onAddSafeZone}
        onRouteClick={onRouteClick}
      />

      {hazards.map((hazard) => {
        if (!hazard.geoJson) return null;

        return (
          <React.Fragment key={`${hazard.id}-${hazard.circles.length}`}>
            {hazard.riskGeoJson && (
              <GeoJSON
                data={hazard.riskGeoJson}
                style={{
                  color: 'var(--hazard)',
                  fillColor: 'var(--hazard)',
                  fillOpacity: 0.15,
                  weight: 1,
                  dashArray: '4, 4',
                }}
                interactive={false}
              />
            )}

            <GeoJSON
              data={hazard.geoJson}
              style={{
                color: 'var(--hazard)',
                fillColor: 'var(--hazard)',
                fillOpacity: 0.4,
                weight: 3,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  if (mode === 'add_route') {
                    onRouteClick({
                      lat: hazard.baseLat,
                      lng: hazard.baseLng,
                      geoJson: hazard.geoJson,
                      zoneId: hazard.id,
                    });
                  } else if (mode === 'delete_zone') {
                    onDeleteZone(hazard.id, 'hazard');
                  } else if (mode === 'view') {
                    onHazardClick(hazard);
                  }
                },
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -20]} opacity={1}>
                <strong
                  style={{
                    color: 'var(--hazard)',
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '16px',
                  }}
                >
                  {hazard.type} Detected
                </strong>
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  <p>
                    <strong>Risk Grade:</strong> {hazard.riskGrade}
                  </p>
                  <p>
                    <strong>Expansion:</strong> {hazard.expansionRate} km/h
                  </p>
                  <p>
                    <strong>Current Population:</strong>{' '}
                    {hazard.population.toLocaleString()}
                  </p>
                  <p>
                    <strong>Initial Radius:</strong>{' '}
                    {(hazard.circles[0].radius / 1000).toFixed(1)} km
                  </p>

                  {hazard.restrictions &&
                    Object.values(hazard.restrictions).some((r) => r) && (
                      <div
                        style={{
                          marginTop: '10px',
                          borderTop: '1px solid rgba(0,0,0,0.1)',
                          paddingTop: '8px',
                        }}
                      >
                        <p
                          style={{
                            color: 'var(--hazard)',
                            fontWeight: '700',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            marginBottom: '4px',
                          }}
                        >
                          Travel Restrictions
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {hazard.restrictions.people && (
                            <span title="No Pedestrians">🚶🚫</span>
                          )}
                          {hazard.restrictions.car && (
                            <span title="No Cars">🚗🚫</span>
                          )}
                          {hazard.restrictions.bicycle && (
                            <span title="No Bicycles">🚲🚫</span>
                          )}
                          {hazard.restrictions.bus && (
                            <span title="No Buses">🚌🚫</span>
                          )}
                        </div>
                      </div>
                    )}

                  <p
                    style={{
                      marginTop: '10px',
                      fontStyle: 'italic',
                      opacity: 0.8,
                      fontSize: '11px',
                    }}
                  >
                    (Dashed ring: 1hr Risk Area · click to edit)
                  </p>
                </div>
              </Tooltip>
            </GeoJSON>
          </React.Fragment>
        );
      })}

      {safeZones.map((zone) => {
        if (!zone.geoJson) return null;

        return (
          <GeoJSON
            key={`${zone.id}-${zone.circles.length}`}
            data={zone.geoJson}
            style={{
              color: 'var(--safe)',
              fillColor: 'var(--safe)',
              fillOpacity: 0.4,
              weight: 3,
            }}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                if (mode === 'add_route') {
                  onRouteClick({
                    lat: zone.baseLat,
                    lng: zone.baseLng,
                    geoJson: zone.geoJson,
                    zoneId: zone.id,
                  });
                } else if (mode === 'delete_zone') {
                  onDeleteZone(zone.id, 'safezone');
                } else if (mode === 'view') {
                  onSafeZoneClick(zone);
                }
              },
            }}
          >
            <Tooltip permanent direction="top" opacity={1}>
              <strong
                style={{
                  color: 'var(--safe)',
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '16px',
                }}
              >
                {zone.name || 'Designated Safe Zone'}
              </strong>
              <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                <p>Capacity: {zone.capacity ?? '—'} people</p>
                <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>
                  (Click to edit)
                </p>
              </div>
            </Tooltip>
          </GeoJSON>
        );
      })}

      {aidZones.map((zone) => {
        if (!zone.geoJson) return null;
        const typeLabel =
          zone.aidType === 'medical'
            ? 'Medical'
            : zone.aidType === 'food'
              ? 'Food'
              : zone.aidType === 'shelter'
                ? 'Shelter'
                : 'Aid';
        return (
          <React.Fragment key={`${zone.id}-${zone.circles.length}`}>
            <GeoJSON
              data={zone.geoJson}
              style={{
                color: 'var(--aid)',
                fillColor: 'var(--aid)',
                fillOpacity: 0.35,
                weight: 3,
              }}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                },
              }}
            >
              <Tooltip permanent direction="top" opacity={1}>
                <strong
                  style={{
                    color: 'var(--aid)',
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '16px',
                  }}
                >
                  {zone.name || 'Aid Zone'}
                </strong>
                <div style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  <p>Type: {typeLabel}</p>
                  <p style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px' }}>
                    Relief / distribution point
                  </p>
                </div>
              </Tooltip>
            </GeoJSON>
            <Marker
              position={[zone.baseLat, zone.baseLng]}
              interactive={false}
              icon={L.divIcon({
                className: 'custom-div-icon',
                html: `
              <div style="
                background: #2563eb;
                width: 26px;
                height: 26px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 800;
                font-size: 18px;
                line-height: 1;
                box-shadow: 0 2px 8px rgba(37, 99, 235, 0.45);
                border: 2px solid white;
              ">+</div>
            `,
                iconSize: [26, 26],
                iconAnchor: [13, 13],
              })}
            />
          </React.Fragment>
        );
      })}

      {routes.map((route) => (
        <Polyline
          key={route.id}
          positions={route.points.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: 'var(--route)', weight: 5, opacity: 0.9 }}
        />
      ))}

      {currentRoutePoints.length > 0 && (
        <Polyline
          positions={currentRoutePoints.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: 'var(--route)',
            weight: 4,
            opacity: 0.5,
            dashArray: '5, 5',
          }}
        />
      )}

      {peopleInDanger.map((person) => (
        <Circle
          key={person.id}
          center={[person.lat, person.lng]}
          radius={12}
          pathOptions={{
            color: 'var(--primary)',
            fillColor: 'var(--primary)',
            fillOpacity: 0.7,
            weight: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -5]}>
            <div style={{ fontSize: '12px', fontWeight: '500' }}>
              GPS: Active Tracking Signal
            </div>
          </Tooltip>
        </Circle>
      ))}

      {emergencyRequests.map((req) => (
        <Marker
          key={req.id}
          position={[req.lat, req.lng]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="
                background: #ef4444;
                width: 26px;
                height: 26px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 18px;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.85);
                border: 1px solid white;
              ">!</div>
            `,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <div
                style={{
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                EMERGENCY · {EMERGENCY_LABELS[req.type] || 'Assistance required'}
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <strong>{req.name}</strong>
                {req.contactCode ? ` (${req.contactCode})` : ''}
              </div>
              {req.reporterName ? (
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Reported by {req.reporterName}
                </div>
              ) : null}
              {req.description ? (
                <div style={{ fontSize: 12, marginTop: 6 }}>{req.description}</div>
              ) : null}
              {onResolveEmergency && (
                <button
                  type="button"
                  onClick={() => onResolveEmergency(req.backendId)}
                  style={{
                    marginTop: 8,
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  Mark resolved
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

      {hospitals.map((hospital) => (
        <Marker
          key={hospital.id}
          position={[hospital.lat, hospital.lng]}
          icon={L.divIcon({
            className: 'custom-div-icon',
            html: `
              <div style="
                background: #ef4444;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
              ">
                <div style="color: white; font-weight: bold; font-size: 20px; line-height: 1;">+</div>
              </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
          })}
        >
          <Tooltip direction="top" offset={[0, -15]}>
            <div style={{ fontWeight: '700' }}>{hospital.name}</div>
            <div style={{ fontSize: '11px' }}>Medical Emergency Center</div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
